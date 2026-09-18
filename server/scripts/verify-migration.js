const mongoose = require('mongoose');

const ATLAS_URI = process.env.ATLAS_URI || 'mongodb+srv://karan9302451907_db_user:G6IsRETwnI0YRIdp@cluster0.4mqprup.mongodb.net/?appName=Cluster0';
const LOCAL_URI = process.env.LOCAL_URI || 'mongodb://127.0.0.1:27017/vertos_production';

async function verifyMigration() {
    console.log('🔄 Connecting to Atlas and Local MongoDB...');
    
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connected to MongoDB Atlas');

    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to Local MongoDB (OCI)');

    const atlasDb = atlasConn.db;
    const localDb = localConn.db;

    const atlasCollections = await atlasDb.listCollections().toArray();
    const localCollections = await localDb.listCollections().toArray();

    const colNames = Array.from(new Set([
        ...atlasCollections.map(c => c.name),
        ...localCollections.map(c => c.name)
    ])).filter(name => !name.startsWith('system.'));

    console.log('\n📊 Collection Parity Check:');
    console.log('------------------------------------------------------------');
    console.log(
        'Collection'.padEnd(25) +
        'Atlas Count'.padEnd(15) +
        'Local Count'.padEnd(15) +
        'Status'
    );
    console.log('------------------------------------------------------------');

    let allMatch = true;

    for (const colName of colNames.sort()) {
        const atlasCount = await atlasDb.collection(colName).countDocuments().catch(() => 0);
        const localCount = await localDb.collection(colName).countDocuments().catch(() => 0);

        const match = atlasCount === localCount;
        if (!match) allMatch = false;

        const status = match ? '✅ MATCH' : '❌ MISMATCH';
        console.log(
            colName.padEnd(25) +
            String(atlasCount).padEnd(15) +
            String(localCount).padEnd(15) +
            status
        );
    }

    console.log('------------------------------------------------------------');
    if (allMatch) {
        console.log('🎉 100% PARITY CONFIRMED: All collections and counts match perfectly!\n');
    } else {
        console.error('⚠️ Discrepancy detected between Atlas and Local MongoDB.\n');
    }

    // Benchmark simple query latency
    console.log('⚡ Latency Benchmark (Fetching 10 documents):');
    const startAtlas = Date.now();
    await atlasDb.collection('documents').find({}).limit(10).toArray();
    const atlasDuration = Date.now() - startAtlas;

    const startLocal = Date.now();
    await localDb.collection('documents').find({}).limit(10).toArray();
    const localDuration = Date.now() - startLocal;

    console.log(`- Atlas Query Time : ${atlasDuration} ms`);
    console.log(`- Local Query Time : ${localDuration} ms`);
    const speedup = (atlasDuration / Math.max(localDuration, 1)).toFixed(1);
    console.log(`🚀 Local MongoDB is ~${speedup}x faster!\n`);

    await atlasConn.close();
    await localConn.close();
}

verifyMigration().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
