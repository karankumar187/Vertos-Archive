const { cloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  try {
    const url = cloudinary.utils.url("vertos_archive_documents/xk88gscpmxodmgvcqa5t.pdf", {
        resource_type: "raw",
        sign_url: true
    });
    console.log("Signed URL:", url);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
