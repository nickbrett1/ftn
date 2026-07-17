use serde::{Deserialize, Serialize};

// ==========================================
// 1. Core Inventory Domain Models (KV Store)
// ==========================================

/// Represents an item in the store's inventory.
/// Stored in Cloudflare KV under the key `item:<barcode>`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InventoryItem {
    /// Scanned barcode string.
    pub barcode: String,
    /// Described product name (toddler-friendly, e.g. "Stuffed Teddy Bear").
    pub name: String,
    /// Price in USD cents (e.g. 500 = $5).
    pub price_cents: u32,
    /// Public URL pointing to R2-hosted image.
    pub image_url: String,
}

// ==========================================
// 2. D1 SQL Relational Records
// ==========================================

/// SQL schema representation of the `transactions` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRecord {
    /// Internally generated UUID for database tracking.
    pub transaction_id: String,
    /// Unique Stripe PaymentIntent identifier (pi_xxx).
    pub payment_intent_id: String,
    /// Total amount of the sale in cents.
    pub amount_cents: u32,
    /// Status description, e.g. "captured".
    pub status: String,
    /// Epoch unix timestamp.
    pub created_at: u64,
}

/// SQL schema representation of the `transaction_items` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionItemRecord {
    /// Auto-incrementing line ID.
    pub item_id: Option<u64>,
    /// Foreign key referencing `TransactionRecord::transaction_id`.
    pub transaction_id: String,
    /// Scanned barcode.
    pub barcode: String,
    /// Item name at time of purchase.
    pub name: String,
    /// Price of the item in cents at time of purchase.
    pub price_cents: u32,
    /// Quantity of items sold.
    pub quantity: u32,
}

// ==========================================
// 3. API Requests & Response Payloads
// ==========================================

/// Request payload for creating a challenge for App Attest validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttestChallengeResponse {
    pub challenge: String,
    pub expires_at: u64,
}

/// Request payload for registering App Attest key.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyAttestRequest {
    pub device_id: String,
    pub key_id: String,
    pub attestation_object: String, // Base64 encoded CBOR attestation statement
    pub challenge: String,
}

/// Payload stored in KV under `attest:device:<device_id>` after registration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceAttestationRecord {
    pub device_id: String,
    pub key_id: String,
    pub registered_at: u64,
    pub last_counter_value: u32,
}

/// Request payload for creating a Stripe PaymentIntent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub amount_cents: u32,
    pub barcodes: Vec<String>,
}

/// Response payload from PaymentIntent creation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentIntentResponse {
    pub payment_intent_id: String,
    pub client_secret: String,
}

/// Request payload to capture a completed payment.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureTransactionRequest {
    pub payment_intent_id: String,
    pub amount_cents: u32,
    pub items: Vec<LineItem>,
}

/// Helper line item structure passed in the capture request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub barcode: String,
    pub name: String,
    pub price_cents: u32,
    pub quantity: u32,
}

/// Response payload confirming transaction capture.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureTransactionResponse {
    pub status: String,
    pub transaction_id: String,
}
