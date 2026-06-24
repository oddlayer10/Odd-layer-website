export async function onRequestPost(context) {
  // CORS preflight handled by Cloudflare Pages — not needed here

  try {
    const input = await context.request.json();

    // Validate input
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return jsonResponse({ error: 'Cart is empty or malformed.' }, 400);
    }

    for (const item of input.items) {
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        return jsonResponse({ error: `Invalid item: ${JSON.stringify(item)}` }, 400);
      }
    }

    // Build Square line items from cart array
    const lineItems = input.items.map(item => ({
      name: item.name,
      quantity: String(item.quantity),
      base_price_money: {
        amount: item.price,       // price in cents (CAD)
        currency: 'CAD'
      }
    }));

    const squareRequest = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: context.env.SQUARE_LOCATION_ID,
        line_items: lineItems
      },
      checkout_options: {
        redirect_url: context.env.REDIRECT_URL || 'https://odd-layer.ca/thank-you'
      }
    };

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-05-15',
        'Authorization': 'Bearer ' + context.env.SQUARE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(squareRequest)
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data.errors?.[0]?.detail ?? 'Unknown Square error.';
      return jsonResponse({ error: detail }, response.status);
    }

    if (data.payment_link?.url) {
      return jsonResponse({ url: data.payment_link.url });
    }

    return jsonResponse({ error: 'Square did not return a checkout URL.' }, 502);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
