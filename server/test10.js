const { cloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  try {
    // Attempt to download a known public raw file using api.cloudinary.com with Basic Auth
    // https://api.cloudinary.com/v1_1/<cloud_name>/resources/raw/upload/<public_id> gives JSON.
    // What if we just use https://<api_key>:<api_secret>@res.cloudinary.com/... ? No.
    const url = `https://${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}@api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/raw/upload/vertos_archive_documents/r5v8ogli1qnyjquk29u8`;
    console.log("Fetching:", url.replace(process.env.CLOUDINARY_API_SECRET, "SECRET"));
    
    const https = require('https');
    https.get(url, (res) => {
        console.log("Status:", res.statusCode);
        console.log("Content-Type:", res.headers['content-type']);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => console.log("Data length:", data.length, "Preview:", data.substring(0,100)));
    });
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
