const { cloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  try {
    const url = cloudinary.utils.private_download_url("vertos_archive_documents/xk88gscpmxodmgvcqa5t.pdf", "", {
        resource_type: "raw"
    });
    console.log("Private Download URL:", url);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
