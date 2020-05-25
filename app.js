
/**
 * A Real Estate as JS Object
 * @typedef {Object} realEstate
 * required properties:
 * @property {string} realEstateID - The ID
 * @property {string} author - The author
 * more properties can be dynamically added
 */
/**
 * A Real Estate as JS Object
 * @typedef {Object} uploadFiles
 * required properties:
 * @property {string} realEstates - A String that contains uploaded XML file
 * @property {object[]} images - Array of uploaded images
 */

const parser = require('fast-xml-parser');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const path = require('path');
const unzipper = require('unzipper');
const { createReadStream } = require("streamifier");
const etl = require("etl");
const fileType = require("file-type");
const convertJSON = require('./jsonBuilder.js');
const Redis = require("ioredis");

require('dotenv/config');
/* 

Required env variables:
 	PORT 			- Specifies port express routes listen to
	LOGINPASSWORD 	- Specifies required password for uploads
	LOGINNAME		- Specifies required username for uploads

*/ 


app.use(fileUpload());
app.set('view engine', 'ejs');
app.get("/:id?", (req,res)=>{
	if(req.params.id != undefined){
		redis.get(req.params.id)
		.then((result) => {
			res.status(200).send(JSON.parse(result));
		});
	}else{
		redis.smembers("authors")
		.then((result) => {return redis.sunion(result); })
		.then((result) => {
			if(result.length < 1){
				return [{}]
			}else{
				return redis.mget(result);
			}
		})
		.then((result) => result.filter((el) => {return el != null;}))
		.then(result =>{
			res.status(200).send(JSON.parse("[" + result + "]"));
		})
		.then(console.log("Finished"))
		.catch((err) => {console.log(err); res.sendStatus(500);});
	}
});

app.post('/', (req, res) => {
	const rawData = req.files.upload.data;
	const author = req.query.author;
	const user = {
		name: req.query.username,
		pass: req.query.password
	};
	const userValid = authenticateUser(user);
	if(userValid === true){
		unpackUpload(rawData)
		.then(parseXML)
		.then(cleanupRealEstates)
		.then(uploads => mergeMetadataToRealEstates(uploads, author))
		.then(realEstates => deleteObjectsFromDatabase(realEstates, author))
		.then(realEstates => writeObjectsToDatabase(realEstates, author))
		.then(() => res.sendStatus(200))
		.catch(err => { console.log('Something broke: ', err); res.sendStatus(500) })
		.finally(()=> console.log('Finished'))	
	}else{
		res.sendStatus(403);
	}
});

//Connect to redis instance
const redis = new Redis();
//Check database connection
redis.on("error", (error) =>{
	console.error(error);
});
redis.on("ready", (error) =>{
	console.log("Connected to Database");
});

app.listen(process.env.PORT, () => {
	console.log('Listening on Port: ' + process.env.PORT);
});


function authenticateUser(user){
		if(user.name == process.env.LOGINNAME && user.pass == process.env.LOGINPASSWORD){
			console.log('Authentication successful');
			return true;
		}else{
			console.log('Authentication failed');
			return new Error('Wrong Credentials');
		}
}

function unpackUpload(upload) {
	const result = {
		xml: undefined,
		images: []
	};
	
	const onUpload = createReadStream(upload)
		// unzip the upload
		.pipe(unzipper.Parse())
		// convert files to encoded strings
		.pipe(etl.map((entry) => entry.buffer().then(buffer => {
			if (fileType(buffer).mime.includes("image")) {
				return {
					type: fileType(buffer),
					data: buffer.toString('base64'),
					filename: entry.path
				};
			} else if (fileType(buffer).mime === "application/xml") {
				return {
					type: fileType(buffer),
					data: buffer.toString(),
					filename: entry.path
				};
			}
		})))
		// push strings to result object
		.on("data", str => {
			if (str.type.ext === "xml") {
				if (result.xml) throw new Error("Multiple real estates definitions");
				result.xml = str;
			} else if (str.type.mime.includes("image")) {
				result.images.push(str);
			}
		});

	return new Promise((res, rej) => {
		onUpload
			.on("end", () =>{console.log('unpacking successfull'); res(result);})
			.on("error", (err) =>{console.log('unpacking failed');  rej(err);});
	});
}
/**
 * 
 * @param {uploadFiles} upload -
 */
function parseXML(upload) {
	const xml = upload.xml.data.replace(/_/g, '');

	const json = parser.parse(xml, {
		attributeNamePrefix: 'attr_',
		attrNodeName: 'attributes',
		textNodeName: '#text',
		ignoreAttributes: false,
		trimValues: true,
		parseAttributeValue: true,
		allowBooleanAttributes: true
	});
	const result = {
		realEstates: json.immoxml.anbieter.immobilie,
		images: upload.images
	}
	return result;
}

function cleanupRealEstates(upload) {
	const realEstates = upload.realEstates.map(el => convertJSON(el));
	upload.realEstates = realEstates;
	return upload;
}
/**
 * 
 * @param {object} upload - JSON with realEstates and images as JSON-Arrays
 * @param {string} author - String with the name of the Author
 * @return {object} JSON with realEstates including images
 */
function mergeMetadataToRealEstates(upload, author) {
	const { realEstates, images } = upload;
	return realEstates.map(el => {
		const result = el;
		result.author = author;
		return result;
	}).map(el => {
		const result = el;
		result.bilder = el.bilder.map(bild => bild == images)
		result.bilder = images.filter(element => result.bilder == element.filename);
		return result;
	});
}
/**
 * 
 * @param {realEstate[]} realEstates - The realEstates to be saved
 * @param {string} author - Name of the author
 * @return {realEstate[]} realEstates 
 */
async function deleteObjectsFromDatabase(realEstates, author) {
	await redis.smembers(author)//get all real estates from author
		.then((result) => redis.del(result, author));//delete all real estates and id list from author
	return realEstates;
}

/**
 * 
 * @param {realEstate[]} realEstates - The {@link realEstate} to be saved
 * @param {string} author - Name of the author
 */
async function writeObjectsToDatabase(realEstates, author) {
	const realEstateIDArray = realEstates.map(({ realEstateID }) => realEstateID);
	// save real estate ID list
	redis.sadd(author, realEstateIDArray);
	//save new real estates 
	realEstates.forEach(el => {
		redis.set(el.realEstateID, JSON.stringify(el));
	});
	//Add author to authors set
	await redis.sadd("authors", author);
	//Rewrite AOF file
	redis.bgrewriteaof().catch(err => console.error("Another rewrite is in progess"))

}
