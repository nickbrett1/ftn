/**
 * Test script for Amazon Orders Worker integration
 * Run this to verify the worker is functioning correctly
 */

// Configuration
const WORKER_URL =
  process.env.AMAZON_ORDERS_WORKER_URL || "http://localhost:8787";

// Test data - common Amazon merchant strings from credit card statements
const testMerchants = [
  "AMAZON.COM*123-4567890-1234567",
  "AMZN.COM/BILL 987-6543210-9876543",
  "Amazon.com 1234567890123456",
  "AMAZON MARKETPLACE SEATTLE WA",
  "AMAZON PRIME*MEMBERSHIP",
  "WHOLE FOODS MKT #10234",
  "AMZN MKTP US*MW3RK1YZ0",
];

/**
 * Test health endpoint
 */
async function testHealth() {
  console.log("🔍 Testing health endpoint...");
  try {
    const response = await fetch(`${WORKER_URL}/health`);
    const data = await response.json();
    console.log("✅ Health check:", data);
    return data;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return null;
  }
}

/**
 * Test parsing merchant strings
 */
async function testParsing() {
  console.log("\n🔍 Testing merchant string parsing...");

  for (const merchant of testMerchants) {
    try {
      const response = await fetch(`${WORKER_URL}/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ merchant }),
      });

      const data = await response.json();
      if (data.found) {
        console.log(`✅ Found order ID in "${merchant}": ${data.order_id}`);
      } else {
        console.log(`⚠️  No order ID in "${merchant}"`);
      }
    } catch (error) {
      console.error(`❌ Failed to parse "${merchant}":`, error.message);
    }
  }
}

/**
 * Test fetching order details
 */
async function testOrderDetails(orderId) {
  console.log(`\n🔍 Testing order details fetch for ${orderId}...`);

  try {
    const response = await fetch(`${WORKER_URL}/order/${orderId}`);
    const data = await response.json();

    if (data.success) {
      console.log("✅ Order details retrieved:");
      console.log(`   Order Date: ${data.data.order_date}`);
      console.log(`   Total: $${data.data.total_amount}`);
      console.log(`   Status: ${data.data.status}`);
      console.log(`   Items: ${data.data.items?.length || 0}`);

      if (data.data.items && data.data.items.length > 0) {
        console.log("\n   Items:");
        data.data.items.forEach((item) => {
          console.log(`   - ${item.name} ($${item.price} x ${item.quantity})`);
        });
      }
    } else {
      console.log("⚠️  Order not found or error:", data.data?.error);
    }

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch order details:", error.message);
    return null;
  }
}

/**
 * Test bulk processing
 */
async function testBulkProcessing() {
  console.log("\n🔍 Testing bulk processing...");

  try {
    const response = await fetch(`${WORKER_URL}/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchants: testMerchants.slice(0, 3),
        fetch_details: false,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log(`✅ Processed ${data.results.length} merchants`);
      data.results.forEach((result) => {
        if (result.found) {
          console.log(`   - ${result.merchant}: ${result.order_id}`);
        }
      });
    } else {
      console.log("❌ Bulk processing failed");
    }

    return data;
  } catch (error) {
    console.error("❌ Bulk processing error:", error.message);
    return null;
  }
}

/**
 * Test integration with credit card billing
 */
async function testCCBillingIntegration() {
  console.log("\n🔍 Testing credit card billing integration...");

  // Simulate a charge from the database
  const mockCharge = {
    id: 123,
    merchant: "AMAZON.COM*123-4567890-1234567",
    amount: 49.99,
    date: "2024-01-15",
    allocated_to: null,
  };

  console.log("Mock charge:", mockCharge);

  // Parse order ID
  const parseResponse = await fetch(`${WORKER_URL}/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ merchant: mockCharge.merchant }),
  });

  const parseData = await parseResponse.json();
  if (parseData.found) {
    console.log(`✅ Extracted order ID: ${parseData.order_id}`);

    // Fetch order details
    const orderData = await testOrderDetails(parseData.order_id);

    // Suggest budget categories
    if (orderData?.success && orderData.data.items) {
      console.log("\n📊 Suggested budget allocations:");
      // This would normally call the categorizeAmazonItems function
      console.log("   (Would categorize items into budget categories)");
    }
  } else {
    console.log("⚠️  No order ID found in merchant string");
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("🚀 Amazon Orders Worker Integration Tests");
  console.log("==========================================");
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log("");

  // Run tests
  const health = await testHealth();

  if (!health) {
    console.log(
      "\n⚠️  Worker not responding. Make sure it's running with: wrangler dev"
    );
    return;
  }

  await testParsing();

  // Test with a sample order ID (this will likely fail without real credentials)
  await testOrderDetails("123-4567890-1234567");

  await testBulkProcessing();

  await testCCBillingIntegration();

  console.log("\n✅ Tests complete!");
  console.log("\nNext steps:");
  console.log(
    "1. Set up Amazon credentials with: wrangler secret put AMAZON_EMAIL"
  );
  console.log("2. Deploy the worker with: wrangler deploy");
  console.log("3. Update the main app with the worker URL");
}

// Run tests
runTests().catch(console.error);
