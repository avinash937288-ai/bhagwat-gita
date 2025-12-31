
import { Verse, Language } from '../types';

export const VERSES: Verse[] = [
  {
    chapter: 1,
    verse: 1,
    sanskrit: "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥ १॥",
    transliteration: "dhṛtarāṣṭra uvāca\ndharmakṣetre kurukṣetre samavetā yuyutsavaḥ |\nmāmakāḥ pāṇḍavāścaiva kimakurvata sañjaya || 1 ||",
    meaning: {
      [Language.HINDI]: "धृतराष्ट्र ने कहा: हे संजय! धर्मभूमि कुरुक्षेत्र में युद्ध की इच्छा से एकत्र हुए मेरे और पाण्डु के पुत्रों ने क्या किया?",
      [Language.ENGLISH]: "Dhritarashtra said: O Sanjaya, gathered on the holy field of Kurukshetra, eager to fight, what did my sons and the sons of Pandu do?",
      [Language.BHOJPURI]: "धृतराष्ट्र कहलन: ए संजय! धरम के धरती कुरुक्षेत्र में जुद्ध करे खातिर जुटल हमार अउर पाण्डु के बेटवन का कइलन?"
    }
  },
  {
    chapter: 2,
    verse: 47,
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ ४७॥",
    transliteration: "karmaṇy-evādhikāras te mā phaleṣu kadācana\nmā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi",
    meaning: {
      [Language.HINDI]: "तुम्हें अपने निर्धारित कर्तव्य का पालन करने का अधिकार है, लेकिन तुम कर्मों के फल के अधिकारी नहीं हो।",
      [Language.ENGLISH]: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
      [Language.BHOJPURI]: "तोहार अधिकार खाली करम कइले में बा, ओकर फल पावे में नाहीं। फल के चिंता मत करअ।"
    }
  }
];

export const findVerse = (ch: number, v: number): Verse | undefined => {
  return VERSES.find(item => item.chapter === ch && item.verse === v);
};
