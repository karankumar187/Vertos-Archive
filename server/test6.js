const { cloudinary } = require('./src/config/cloudinary');
const fs = require('fs');
require('dotenv').config();

async function test() {
  // A tiny, valid PDF file (1-page, blank)
  const pdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSKUrnCtRTyuQIVDA0UjBSMDfQUShLzUhnCUgxhLHMDFQNDQxMDcyNzA2NTExOIAyNLAyNLIxMToFqQsLmlkamZkYmJuYGOoY6ZjqGOkY6BjpGOqY5ZfGZJSUFqkV5yfk5qXklqEQBv1yLwCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMzEKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI4IDg0MS44OV0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSAxIDAgUj4+Pj4vQ29udGVudHMgMiAwIFI+PgplbmRvYmoKCjUgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzQgMCBSXS9Db3VudCAxPj4KZW5kb2JqCgoxIDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoR2hvc3RzY3JpcHQgOS41MCkvQ3JlYXRpb25EYXRlKEQ6MjAyMDA2MjExNDM4MjBaKT4+CmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMzcyIDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEzNyAwMDAwMCBuIAowMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAyNzEgMDAwMDAgbiAKMDAwMDAwMDMyMiAwMDAwMCBuIAowMDAwMDAwMzcyIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA4L1Jvb3QgNiAwIFIvSW5mbyA3IDAgUj4+CnN0YXJ0eHJlZgo0NjMKJSVFT0YK";
  const buf = Buffer.from(pdfBase64, 'base64');
  try {
    const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'vertos_archive_documents', resource_type: 'auto' },
        (error, result) => {
            if (error) console.log("ERROR:", error);
            else console.log("Upload Result:", result.secure_url, "Resource type:", result.resource_type);
        }
    );
    uploadStream.end(buf);
  } catch (err) {
    console.log("ERROR:", err);
  }
}
test();
