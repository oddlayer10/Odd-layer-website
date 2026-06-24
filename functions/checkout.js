export async function onRequestPost(context) {
  try {
    const input = await context.request.json();
    
    const squareRequest = {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: context.env.SQUARE_LOCATION_ID,
        line_items: [{
          name: input.itemName,
          quantity: '1',
          base_price_money: {
            amount: input.itemPrice,
            currency: 'CAD'
          }
        }]
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

    if (data.payment_link && data.payment_link.url) {
      return new Response(JSON.stringify({ url: data.payment_link.url }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: data.errors[0].detail }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
