function builder(immo) {
	const realEstateID = String(immo.verwaltungtechn.objektnrextern);

		var realEstate =
			{
				realEstateID : realEstateID.replace(/\s/g, ""),
				categorie: categories(immo.objektkategorie),
				geo: location(immo.geo),
				contact: contactperson(immo.kontaktperson),
				preise: prices(immo.preise),
				flaechen: areas(immo.flaechen),
				aussattung: interieur(immo.aussattung),
				zustand: '',//TODO
				infrastruktur: '', //TODO  
				bilder: images(immo.anhaenge),
				author: immo.author
			}
		return realEstate;
}

/*
{
	nutzungsart: String,
	vermarktungsart: String,
	objektart: String
}
Defaults sind ''(leere Strings)
*/
function categories(objektkategorie) {//TODO objektart
	var newCategories = {};
	for (categorie in objektkategorie) {
		switch (categorie) {
			case 'nutzungsart':
				var nutzungsart = objektkategorie.nutzungsart;
				if (typeof nutzungsart.attributes == 'object') {
					var attributes = nutzungsart.attributes;
					if (attributes.attr_ANLAGE) {
						newCategories['nutzungsart'] = 'Kapitalanlage';
					} else if (attributes.attr_GEWERBE) {
						newCategories['nutzungsart'] = 'Gewerbe';
					} else if (attributes.attr_WOHNEN) {
						newCategories['nutzungsart'] = 'Wohnen';
					} else {
						newCategories['nutzungsart'] = 'Sontiges';
					}
				} else {
					newCategories['nutzungsart'] = 'Sontiges';
				}
				break;
			case 'vermarktungsart':
				var vermarktungsart = objektkategorie.vermarktungsart;
				if (typeof vermarktungsart.attributes == 'object') {
					var attributes = vermarktungsart.attributes;
					if (attributes.attr_ERBPACHT) {
						newCategories['vermarktungsart'] = 'Erbpacht';
					} else if (attributes.attr_KAUF) {
						newCategories['vermarktungsart'] = 'Kauf';
					} else if (attributes.attr_MIETEPACHT) {
						newCategories['vermarktungsart'] = 'Miete/Pacht';
					} else {
						newCategories['vermarktungsart'] = 'Kauf';
					}
				} else {
					newCategories['vermarktungsart'] = 'Kauf';
				}
				break;
			case 'objektart':
				//TODO
				break;
			default:
		}
	}
	return newCategories;
}

function location(geo) {
	//Iterate over attribute names
	/*       
		plz
		ort
		bundesland
		strasse
		hausnummer
		land
	*/
	var newGeo = {};
	for (attribute in geo) {
		switch (attribute) {
			case 'plz':
				newGeo['plz'] = geo.plz;
				break;
			case 'ort':
				newGeo['ort'] = geo.ort;
				break;
			case 'bundesland':
				newGeo['bundesland'] = geo.bundesland;
				break;
			case 'strasse':
				newGeo['strasse'] = geo.strasse;
				break;
			case 'hausnummer':
				newGeo['hausnummer'] = geo.hausnummer;
				break;
			case 'land':
				var l = geo.land;
				var atr;
				if (typeof l == String) {
					atr = l;
				} else if (typeof l == "object") {
					atr = l.attributes.attr_isoland;
				} else {
					atr = "DE"
				}
				newGeo['land'] = atr;
				break;
			default:
		}
	}
	return newGeo;
}

function contactperson(kontaktperson) {
	/*
	    strasse
        hausnummer
        plz
        ort
        land
        email_zentrale
        email_direkt
        tel_zentrale
        tel_durchw
        tel_fax
        name
        vorname
        anrede
        url
        personennummer
	*/
	var newContact = {};
	for (attribute in kontaktperson) {
		switch (attribute) {
			case 'plz':
				newContact['plz'] = kontaktperson.plz;
				break;
			case 'ort':
				newContact['ort'] = kontaktperson.ort;
				break;
			case 'strasse':
				newContact['strasse'] = kontaktperson.strasse;
				break;
			case 'hausnummer':
				newContact['hausnummer'] = kontaktperson.hausnummer;
				break;
			case 'land':
				var l = kontaktperson.land;
				var atr;
				if (typeof l == String) {
					atr = l;
				} else if (typeof l == "object") {
					atr = l.attributes.attr_isoland;
				} else {
					atr = "DE"
				}
				newContact['land'] = atr;
				break;
			case 'email_zentrale':
				newContact['email_zentrale'] = kontaktperson.email_zentrale;
				break;
			case 'email_direkt':
				newContact['email_direkt'] = kontaktperson.email_direkt;
				break;
			case 'tel_zentrale':
				newContact['tel_zentrale'] = kontaktperson.tel_zentrale;
				break;
			case 'tel_durchw':
				newContact['tel_durchw'] = kontaktperson.tel_durchw;
				break;
			case 'tel_fax':
				newContact['tel_fax'] = kontaktperson.tel_fax;
				break;
			case 'name':
				newContact['name'] = kontaktperson.name;
				break;
			case 'vorname':
				newContact['vorname'] = kontaktperson.vorname;
				break;
			case 'anrede':
				newContact['anrede'] = kontaktperson.anrede;
				break;
			case 'url':	
				newContact['url'] = kontaktperson.url;
				break;
			case 'personennummer':
				newContact['personennummer'] = kontaktperson.personennummer;
				break;
			default:
		}
	}
	return newContact;
}

function prices(preise) {//TODO complete

	return "";
}
function areas(flaechen) {//TODO complete

	return "";
}
function interieur(aussattung) {//TODO complete

	return "";
}

function images(input) {
	const anhaenge = Array.isArray(input.anhang) ? input.anhang : [ input.anhang ];
	const bilder = anhaenge
		.filter(el => el && el.attributes && el.attributes.attr_gruppe === 'BILD')
		.map(el => el.daten.pfad);
	return bilder;
}

module.exports = builder;