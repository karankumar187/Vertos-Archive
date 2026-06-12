const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { cloudinary } = require('./src/config/cloudinary');
const fs = require('fs');

async function testCloudinaryPdf() {
    try {
        console.log("Uploading test PDF to Cloudinary as image...");
        // create a tiny dummy PDF
        const pdfBase64 = "JVBERi0xLjEKJcKlwrHDqwoKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCgoyIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2VzCiAgICAgL0tpZHMgWyAzIDAgUiBdCiAgICAgL0NvdW50IDEKICA+PgplbmRvYmoKCjMgMCBvYmoKICA8PCAvVHlwZSAvUGFnZQogICAgIC9QYXJlbnQgMiAwIFIKICAgICAvTWVkaWFCb3ggWyAwIDAgNTA0IDI4OCBdCiAgICAgL0NvbnRlbnRzIDQgMCBSCiAgICAgL1Jlc291cmNlcyA8PAogICAgICAgIC9Qcm9jU2V0IFsvUERGIC9UZXh0XQogICAgICAgIC9Gb250IDw8IC9GMSA1IDAgUiA+PgogICAgID4+CiAgPj4KZW5kb2JqCgo0IDAgb2JqCiAgPDwgL0xlbmd0aCAzNSA+PgogIHN0cmVhbQogIEJUCiAgL0YxIDE4IFRmCiAgMCAwIFRkCiAgKEhlbGxvIFdvcmxkKSBUagogIEVUCiAgZW5kc3RyZWFtCmVuZG9iagoKNSAwIG9iagogIDw8IC9UeXBlIC9Gb250CiAgICAgL1N1YnR5cGUgL1R5cGUxCiAgICAgL0Jhc2VGb250IC9IZWx2ZXRpY2EKICA+PgplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDc3IDAwMDAwIG4gCjAwMDAwMDAxMzQgMDAwMDAgbiAKMDAwMDAwMDI5OCAwMDAwMCBuIAowMDAwMDAwMzg2IDAwMDAwIG4gCnRyYWlsZXIKICA8PCAvUm9vdCAxIDAgUgogICAgIC9TaXplIDYKICA+PgpzdGFydHhyZWYKNDc0CiUlRU9GCg==";
        const buffer = Buffer.from(pdfBase64, 'base64');

        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
                if (error) console.error("Error:", error);
                else {
                    console.log("Success:", result);
                    cloudinary.uploader.destroy(result.public_id);
                }
            }
        );
        uploadStream.end(buffer);
    } catch (e) {
        console.error(e);
    }
}
testCloudinaryPdf();
