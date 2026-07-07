const mongoose = require('mongoose');
const Document = require('./src/models/Document');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await Document.find().lean();
  console.log("Documents found:", docs.length);
  for (const doc of docs.slice(0, 3)) {
      console.log(doc.fileUrl);
  }
  process.exit(0);
}
test();
