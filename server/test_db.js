const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://karankumar:LwG8Y7xXqK7iH40X@cluster0.o5hck.mongodb.net/lpu_assistant?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
  const docs = await mongoose.connection.db.collection('documents').find({}).sort({createdAt: -1}).limit(5).toArray();
  docs.forEach(d => console.log(d.title));
  mongoose.disconnect();
});
