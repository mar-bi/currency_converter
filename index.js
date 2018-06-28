// when "ready":

// 1. get list of currencies and send(render them) into select#currency-from
// and select#currency-to as list of options

// 2. send form data when "convert" is clicked - event listener on button, 
//form events
// construct query

//3. render received data into input#conv-result

const ready = function(fn){
  if (typeof fn !== 'function') return;
  
  // if document is already loaded
  if (document.readyState === 'interactive' || document.readyState === 'complete'){
    return fn();
  }
  // or wait until loaded
  document.addEventListener('DOMContentLoaded', fn, false);
}

const dbPromise = idb.open('convert-db', 1, upgradeDb => {
  if (!upgradeDb.objectStoreNames.contains('rates')) {
    const rateOS =upgradeDb.createObjectStore('rates', {keyPath: 'id'}); 
    rateOS.createIndex('title', 'title');  
  }

  if (!upgradeDb.objectStoreNames.contains('currencies')) {
    const currenciesOS = upgradeDb.createObjectStore('currencies', {
      keyPath: 'id',
      autoIncrement: true
    });
  }
});


// the app logic
function app(){
  //register service worker

  //!!! change location of sw file to 'repo-name/sw.js' and scope to '/repo-name/
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').then(registration => {
      console.log(`Registration is successful, the scope is ${registration.scope}`);
    }).catch(err => {
      console.log(err);
    });
  }

  //clear convert result
  clearConvertResults();

  // get & set list of currencies
  getCurrencies();

  //add EventListener to the form
  // const convertForm = document.getElementById('converter-form');
  
  // convertForm.addEventListener('submit', handleConvert, false);

  //add eventListener to select elements
  // const selectFrom = document.querySelector('#currency-from'),
  //   selectTo = document.querySelector('#currency-to');

  // selectFrom.addEventListener('change', clearConvertResults, false);
  // selectTo.addEventListener('change', clearConvertResults, false);
}


function clearConvertResults(){
  const input = document.querySelector('#conv-result');
  input.value = '';
}

function respondJson(response){
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response.json();
}

function getCurrencies(){
  // search in idb first, if not found - fetch currencies
  dbPromise.then(db => {
    if (!db) return;
    
    const tx = db.transaction('currencies', 'readonly');
    const store = tx.objectStore('currencies');
    return store.getAll(); 
  }).then(results => {
    if (results.length === 0){
      // call fetch
      console.log('going to fetch currencies');
      return fetchCurrencies().then(result => {
        setCurrencies(result);
      });
    }
    //or send currencies to be set in UI
    console.log('using idb records');
    return setCurrencies(results[0].list);
  }).catch(err => {
    console.log(err);
  });
}

// get list of currencies from API 
function fetchCurrencies(){
  const url = "https://free.currencyconverterapi.com/api/v5/currencies";
  const listCurrRequest = new Request(url);

  if (!('fetch' in window)) {
    console.log('Fetch API not found');
    return;
  }
  
  return fetch(listCurrRequest).then(response => {
    return respondJson(response);
  }).then(resJson => {
    const currencies = Object.keys(resJson.results).sort();
    saveCurrencies(currencies);
    return currencies;
  })
  .catch(err => {
    console.log(err);
  });
}

// save array of currencies to indexedDB
function saveCurrencies(currArray){
  dbPromise.then(db => {
    if (!db) return;

    const tx = db.transaction('currencies', 'readwrite');
    const store = tx.objectStore('currencies');
    const item = { list: currArray }; 
    store.add(item);
    return tx.complete;
  }).then(() => {
    console.log(`currencies saved to db`);
  }).catch(err => {
    console.log(err);
  });
}

// create options for every currency and append it to <select> 
function setCurrencies(currArray){
  const fromElement = document.getElementById('currency-from');
  const toElement = document.getElementById('currency-to');
  const fragment = document.createDocumentFragment();

  // sort currencies, loop over them, then append an option to the fragment
  currArray.forEach(elem => {
    const option = document.createElement('option');
    option.innerHTML = elem.toUpperCase();
    fragment.appendChild(option);
  });
  
  const fragmentCopy = fragment.cloneNode(true);
  fromElement.appendChild(fragment);
  toElement.appendChild(fragmentCopy);
}


function handleConvert(event){
  event.preventDefault();

  const amount = Number(document.querySelector('#conv-amount').value),
    currFrom = document.querySelector('#currency-from').value,
    currTo = document.querySelector('#currency-to').value,
    convertResult = document.querySelector('#conv-result');

  console.log(`From: ${currFrom} To: ${currTo} Amount: ${amount}`);

  getExchangeRates(currFrom, currTo).then(result => {
    const key = `${currFrom}_${currTo}`;
    const converted = result[key].val * amount;
    convertResult.value = converted.toFixed(2);
    console.log(`Exchange rate is ${result[key].val}`);

    // flatten results to save in indexed DB
    // like {key: result[key].val}
  }).catch(err => {
    console.log(err);
  });
}


function getExchangeRates(currencyFrom, currencyTo){
  currencyFrom = encodeURIComponent(currencyFrom);
  currencyTo = encodeURIComponent(currencyTo);
  const query = `${currencyFrom}_${currencyTo},${currencyTo}_${currencyFrom}`,
    url = `https://free.currencyconverterapi.com/api/v5/convert?q=${query}`,
    rateRequest = new Request(url);

  if (!('fetch' in window)) {
    console.log('Fetch API not found');
    return;
  }

  return fetch(rateRequest).then(response => {
    return respondJson(response);
  }).then(jsonResponse => {
    return jsonResponse.results;
  }).catch(err => {
    console.log(err);
  });
}


// starting the application
ready(app);