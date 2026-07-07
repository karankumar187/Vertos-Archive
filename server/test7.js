const { cloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  try {
    // Generate private download URL
    const url = cloudinary.utils.private_download_url(
        "vertos_archive_documents/krgxfldrxnxp68nhzwfm.pdf",
        "", 
        { resource_type: "raw" }
    );
    console.log("Private Download URL:", url);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
