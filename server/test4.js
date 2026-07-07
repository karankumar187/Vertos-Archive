const { uploadBufferToCloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  const buf = Buffer.from("dummy pdf content %PDF-1.4");
  try {
    const res = await uploadBufferToCloudinary(buf, 'application/pdf', 'vertos_archive_documents');
    console.log("Upload Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
