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
  // getCurrencies().then(currencies => {
  //   setCurrencies(currencies);
  // }).catch(err => {
  //   console.log(err);
  // });

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
  const url = "https://free.currencyconverterapi.com/api/v5/currencies";
  const listCurrRequest = new Request(url);

  if (!('fetch' in window)) {
    console.log('Fetch API not found');
    return;
  }
  
  return fetch(listCurrRequest).then(response => {
    return respondJson(response);
  }).then(resJson => {
    return Object.keys(resJson.results);
  })
  .catch(err => {
    console.log(err);
  });
}

function setCurrencies(currArray){
  const fromElement = document.getElementById('currency-from');
  const toElement = document.getElementById('currency-to');
  const fragment = document.createDocumentFragment();

  // sort currencies, loop over them, then append an option to the fragment
  currArray.sort().forEach(elem => {
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