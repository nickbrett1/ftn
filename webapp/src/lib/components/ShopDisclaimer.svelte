<!-- webapp/src/lib/components/ShopDisclaimer.svelte -->
<div class="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 mb-8 rounded-r-lg backdrop-blur-md">
    <div class="flex items-center">
        <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
        </div>
        <div class="ml-3">
            <p class="text-sm text-yellow-200">
                <span class="font-bold">MOCK SHOP:</span> This is a demonstration site for testing agentic workflows and Stripe API integrations. 
                No real payments are processed, and no goods will be delivered. 
                Use <a href="https://stripe.com/docs/testing#cards" target="_blank" class="underline hover:text-white">Stripe Test Card numbers</a> for checkout.
            </p>
        </div>
    </div>
</div>
