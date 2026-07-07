const { cloudinary } = require('./src/config/cloudinary');
require('dotenv').config();

async function test() {
  const buf = Buffer.from("dummy pdf content %PDF-1.4");
  try {
    const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vertos_archive_documents', resource_type: 'image', format: 'pdf' },
        (error, result) => {
            if (error) console.log("ERROR:", error);
            else console.log("Upload Result:", result.secure_url);
        }
    );
    uploadStream.end(buf);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
