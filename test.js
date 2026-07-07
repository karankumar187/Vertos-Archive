const { uploadBufferToCloudinary } = require('./server/src/config/cloudinary');
const fs = require('fs');

async function test() {
  const buf = Buffer.from("dummy pdf content %PDF-1.4");
  try {
    const res = await uploadBufferToCloudinary(buf, 'application/pdf', 'vertos_archive_documents');
    console.log("SUCCESS:", res.secure_url);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
require('dotenv').config({path: './server/.env'});
test();
