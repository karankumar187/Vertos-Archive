const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dbxbgw2kq',
  api_key: '123',
  api_secret: 'abc'
});

const u = "https://res.cloudinary.com/dbxbgw2kq/raw/authenticated/s---rITMHMp--/v1784198682/vertos_archive_documents/qczoafhdc1t70cpwzftl.pdf";
const match = u.match(/\/(raw|image|video)\/(upload|authenticated)\/(?:s--[a-zA-Z0-9_-]+--\/)?(?:v\d+\/)?(.+?)$/);
if (match) {
    const resource_type = match[1]; // raw
    const type = match[2]; // authenticated
    const publicIdWithExt = match[3]; // vertos_archive_documents/qczoafhdc1t70cpwzftl.pdf
    const extMatch = publicIdWithExt.match(/\.([a-z0-9]+)$/i);
    const format = extMatch ? extMatch[1] : ''; // pdf
    const publicIdStripped = extMatch ? publicIdWithExt.slice(0, -extMatch[0].length) : publicIdWithExt;
    
    console.log("Stripped ID:", publicIdStripped, "Format:", format);
    const urlStripped = cloudinary.utils.private_download_url(publicIdStripped, format, { type, resource_type });
    console.log("URL Stripped:", urlStripped);

    console.log("Full ID:", publicIdWithExt, "Format:", "");
    const urlFull = cloudinary.utils.private_download_url(publicIdWithExt, '', { type, resource_type });
    console.log("URL Full:", urlFull);
}
