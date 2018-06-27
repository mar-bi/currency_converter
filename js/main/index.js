// when "ready"

// 1. get list of currencies and send(render them) into select#currency-from
// and select#currency-to as list of options

// 2. send form data when "convert" is clicked - event listener on button, 
//form events
// construct query

//3. render received data into input#conv-result

const ready = function(fn){
  if ( typeof fn !== 'function' ) return;
  
  // if document is already loaded
  if ( document.readyState === 'interactive' || document.readyState === 'complete' ) {
    return fn();
  }
  // or wait until loaded
  document.addEventListener('DOMContentLoaded', fn, false);
}


function app(){
  // get & set list of currencies
   getCurrencies().then(currencies => {
     setCurrencies(currencies);
   });
}

function getCurrencies(){
  const path = "https://free.currencyconverterapi.com/api/v5/currencies";
  const listCurrRequest = new Request(path);

  if (!('fetch' in window)) {
    console.log('Fetch API not found');
    return;
  }
  
  return fetch(listCurrRequest).then(response => {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response.json();
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


ready(app);
