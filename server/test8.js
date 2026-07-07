const { cloudinary } = require('./src/config/cloudinary');
const fs = require('fs');
require('dotenv').config();

async function test() {
  const buf = Buffer.from("dummy pdf content %PDF-1.4");
  try {
    const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vertos_archive_documents', resource_type: 'raw', format: 'pdf', type: 'authenticated' },
        (error, result) => {
            if (error) console.log("ERROR:", error);
            else {
                console.log("Upload Result:", result.secure_url);
                const dlUrl = cloudinary.utils.private_download_url(result.public_id, "pdf", { type: "authenticated", resource_type: "raw" });
                console.log("Download URL:", dlUrl);
            }
        }
    );
    uploadStream.end(buf);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
