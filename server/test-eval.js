const fs = require('fs');

async function test() {
  try {
    const fetch = (await import('node-fetch')).default;
    const FormData = require('form-data');
    const form = new FormData();
    form.append('contextQuestion', 'test');
    form.append('image', fs.createReadStream('./package.json'));

    const res = await fetch('http://localhost:5000/api/evaluate', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer test'
      }
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}

test();
