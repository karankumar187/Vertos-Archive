const { cloudinary } = require('./src/config/cloudinary');

const url1 = "https://res.cloudinary.com/dbxbgw2kq/raw/authenticated/s--P0yr0fLy--/v1783202986/vertos_archive_documents/ipcmxshigagbvwrtnilj.pdf";
const url2 = "https://res.cloudinary.com/dbxbgw2kq/raw/upload/v1783202705/vertos_archive_documents/xk88gscpmxodmgvcqa5t.pdf";
const url3 = "https://res.cloudinary.com/dbxbgw2kq/image/upload/v1781124231/vertos_archive_documents/dho7397jekhjpcox88rq.jpg";

function getDownloadUrl(url) {
    if (!url.includes('/raw/')) return url; // Only intercept raw files
    
    // Extract public ID from Cloudinary URL
    // Format: .../raw/[upload|authenticated]/[signature/][version/]<public_id>
    const match = url.match(/\/raw\/(upload|authenticated)\/(?:s--[a-zA-Z0-9_-]+--\/)?(?:v\d+\/)?(.+?)$/);
    if (match) {
        const type = match[1]; // 'upload' or 'authenticated'
        const publicId = match[2];
        const extMatch = publicId.match(/\.([a-z0-9]+)$/i);
        const format = extMatch ? extMatch[1] : '';
        
        return cloudinary.utils.private_download_url(publicId, format, { type, resource_type: "raw" });
    }
    return url;
}

console.log(getDownloadUrl(url1));
console.log(getDownloadUrl(url2));
console.log(getDownloadUrl(url3));
