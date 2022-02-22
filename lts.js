const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const async = require('async');
const dTitles = require('./datasetTitles.json');
const results = [];

// let publisherTitles = {};
// let datasetTitles = {};

const countryTitles = require('./countryTitles.json');
const publisherTitles = require('./publisherTitles.json');
const datasetTitles = require('./datasetTitles.json');

// load data
fs.createReadStream('dataset-summary.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(results.length);
    transform();
    // [
    //   { NAME: 'Daffy Duck', AGE: '24' },
    //   { NAME: 'Bugs Bunny', AGE: '22' }
    // ]
  });

// transform by adding titles
function transform() {
  // get unique publisherKeys
  const publishersSet = new Set();
  const datasetSet = new Set();
  const countrySet = new Set();
  results.forEach(x => {
    publishersSet.add(x.publisher_id);
    datasetSet.add(x.dataset_id);
    countrySet.add(x.publisher_country);
  });
  console.log('distinct publishers: ', publishersSet.size);
  console.log('distinct datasets: ', datasetSet.size);
  console.log('distinct countries: ', countrySet.size);
  let publisherKeys = Array.from(publishersSet);
  let datasetKeys = Array.from(datasetSet);
  // let countryKeys = Array.from(countrySet);
  // getPublishers(publisherKeys);
  // getDatasets(datasetKeys);

  // add titles
  results.forEach(x => {
    x.publisherTitle = publisherTitles[x.publisher_id];
    x.datasetTitle = datasetTitles[x.dataset_id];
    x.countryTitle = countryTitles[x.publisher_country];
  });

  const months = Object.keys(results[0])
    .filter(e => [
      'publisher_country', 
      'publisher_id', 
      'dataset_id', 
      'datasetTitle', 
      'publisherTitle', 
      'countryTitle'
    ].indexOf(e) === -1)
    .filter(e => !e.endsWith('_new_ids'))
    .map(e => e.substr(0,10))
    .sort();

  results.forEach(x => {
    months.forEach(m => {
      x[`${m}_records`] = Number.parseInt(x[`${m}_records`]);
      x[`${m}_new_ids`] = Number.parseInt(x[`${m}_new_ids`]);
    });
  });
  
  
  saveTitles(results, 'enriched');
}

async function getPublishers(keys) {
  async.eachLimit(keys, 10, getPublisher, function (err) {
    if (err) {
      console.log(err);
    } else {
      saveTitles(publisherTitles, 'publisherTitles');
    }
  });
}

async function getDatasets(keys) {
  async.eachLimit(keys, 10, getDataset, function (err) {
    if (err) {
      console.log(err);
    } else {
      saveTitles(datasetTitles, 'datasetTitles2');
    }
  });
}

async function getPublisher(key, callback) {
  try {
    let response = await axios.get(`http://api.gbif.org/v1/organization/${key}`);
    publisherTitles[key] = response.data.title;
  } catch(err) {
    console.log(key);
    console.log(err);
  }
}

async function getDataset(key, callback) {
  if (dTitles[key]) {
    datasetTitles[key] = dTitles[key];
    return;
  }
  try {
    let response = await axios.get(`http://api.gbif.org/v1/dataset/${key}`);
    datasetTitles[key] = response.data.title;
  } catch(err) {
    console.log(key);
    console.log(err);
  }
}

function saveTitles(titles, name) {
  fs.writeFile(`./${name}.json`, JSON.stringify(titles, null, 2), function (err) {
    if (err) return console.log(err);
    console.log('Hello World > helloworld.txt');
  });
}