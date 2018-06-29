// start when the 'document' is loaded
const ready = function(fn) {
  if (typeof fn !== "function") return;

  // if document is already loaded
  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    return fn();
  }
  // or wait until loaded
  document.addEventListener("DOMContentLoaded", fn, false);
};

// create IndexedDB stores
const dbPromise = idb.open("convert-db", 1, upgradeDb => {
  if (!upgradeDb.objectStoreNames.contains("rates")) {
    const rateOS = upgradeDb.createObjectStore("rates", { keyPath: "title" });
    rateOS.createIndex("title", "title");
  }

  if (!upgradeDb.objectStoreNames.contains("currencies")) {
    upgradeDb.createObjectStore("currencies", {
      keyPath: "id",
      autoIncrement: true
    });
  }
});

// the app logic
function app() {
  //register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/currency_converter/sw.js", {
        scope: "/currency_converter/"
      })
      .then(registration => {
        console.log(
          `Registration is successful, the scope is ${registration.scope}`
        );
      })
      .catch(err => {
        console.log(err);
      });
  }

  //clear convert result
  clearConvertResults();

  // get & set list of currencies
  getCurrencies()
    .then(currencies => {
      setCurrencies(currencies);
    })
    .catch(err => {
      console.log(err);
    });

  //add EventListener to the form
  const convertForm = document.querySelector("#converter-form");

  convertForm.addEventListener("submit", handleConvert, false);

  //add EventListener to select elements
  const selectFrom = document.querySelector("#currency-from"),
    selectTo = document.querySelector("#currency-to");

  selectFrom.addEventListener("change", clearConvertResults, false);
  selectTo.addEventListener("change", clearConvertResults, false);

  //add EventListener to "swap button"
  const swapButton = document.querySelector("#swap");

  swapButton.addEventListener("click", swapCurrencies, false);
}

// HELPER FUNCTIONS -----------------------------------------------------------

function clearConvertResults() {
  const input = document.querySelector("#conv-result");
  input.value = "";
}

function respondJson(response) {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response.json();
}

// CURRENCIES FUNCTIONS -------------------------------------------------------

function getCurrencies() {
  // search in idb first, if not found - fetch currencies
  return dbPromise
    .then(db => {
      if (!db) return;

      const tx = db.transaction("currencies", "readonly");
      const store = tx.objectStore("currencies");
      return store.getAll();
    })
    .then(results => {
      if (results.length === 0) {
        // call fetch
        console.log("going to fetch currencies");
        return fetchCurrencies();
      }
      //or send currencies to be set in UI
      console.log("using currencies from idb");
      return results[0].list;
    })
    .catch(err => {
      console.log(err);
    });
}

// get list of currencies from API
function fetchCurrencies() {
  const url = "https://free.currencyconverterapi.com/api/v5/currencies";
  const listCurrRequest = new Request(url);

  if (!("fetch" in window)) {
    console.log("Fetch API not found");
    return;
  }

  return fetch(listCurrRequest)
    .then(response => {
      return respondJson(response);
    })
    .then(resJson => {
      const currencies = Object.keys(resJson.results).sort();
      saveCurrencies(currencies);
      return currencies;
    })
    .catch(err => {
      console.log(err);
    });
}

// save array of currencies to indexedDB
function saveCurrencies(currArray) {
  dbPromise
    .then(db => {
      if (!db) return;

      const tx = db.transaction("currencies", "readwrite");
      const store = tx.objectStore("currencies");
      const item = { list: currArray };
      store.add(item);
      return tx.complete;
    })
    .then(() => {
      console.log(`currencies saved to db`);
    })
    .catch(err => {
      console.log(err);
    });
}

// create options for every currency and append it to <select>
function setCurrencies(currArray) {
  const fromElement = document.querySelector("#currency-from"),
    toElement = document.querySelector("#currency-to"),
    fragment = document.createDocumentFragment();

  // sort currencies, loop over them, then append an option to the fragment
  currArray.forEach(elem => {
    const option = document.createElement("option"),
      optionValue = elem.toUpperCase();
    option.innerHTML = optionValue;
    option.setAttribute("value", optionValue);
    fragment.appendChild(option);
  });

  const fragmentCopy = fragment.cloneNode(true);
  fromElement.appendChild(fragment);
  toElement.appendChild(fragmentCopy);
}

// CONVERSION FUNCTIONS -------------------------------------------------------

function handleConvert(event) {
  event.preventDefault();

  const amount = Number(document.querySelector("#conv-amount").value),
    currFrom = document.querySelector("#currency-from").value,
    currTo = document.querySelector("#currency-to").value,
    convertResult = document.querySelector("#conv-result");

  console.log(`From: ${currFrom} To: ${currTo} Amount: ${amount}`);

  getExchangeRates(currFrom, currTo)
    .then(result => {
      console.log(`Exchange rate is ${result.value}`);
      // calculate & set the result
      const converted = result.value * amount;
      convertResult.value = converted.toFixed(2);
    })
    .catch(err => {
      console.log(err);
    });
}

function getExchangeRates(currFrom, currTo) {
  // check if the rate is in db
  // if found -> use it
  // if not -> fetch the rate and save to DB.
  return dbPromise
    .then(db => {
      if (!db) return;

      const tx = db.transaction("rates", "readonly"),
        index = tx.objectStore("rates").index("title");
      return index.get(`${currFrom}_${currTo}`);
    })
    .then(value => {
      return value || getExchangeRatesFromAPI(currFrom, currTo);
    })
    .catch(err => {
      console.log(err);
    });
}

function getExchangeRatesFromAPI(currencyFrom, currencyTo) {
  currencyFrom = encodeURIComponent(currencyFrom);
  currencyTo = encodeURIComponent(currencyTo);
  const query = `${currencyFrom}_${currencyTo},${currencyTo}_${currencyFrom}`,
    url = `https://free.currencyconverterapi.com/api/v5/convert?q=${query}`,
    rateRequest = new Request(url);

  if (!("fetch" in window)) {
    console.log("Fetch API not found");
    return;
  }

  return fetch(rateRequest)
    .then(response => {
      return respondJson(response);
    })
    .then(jsonResponse => {
      const { results } = jsonResponse;
      const rates = flattenExchangeRates(results, currencyFrom, currencyTo);

      saveExchangeRates(rates);
      return rates[0];
    })
    .catch(err => {
      console.log(err);
    });
}

function saveExchangeRates(ratesArr) {
  dbPromise
    .then(db => {
      if (!db) return;

      const tx = db.transaction("rates", "readwrite");
      const store = tx.objectStore("rates");
      const [item1, item2] = ratesArr;

      store.put(item1);
      store.put(item2);
      return tx.complete;
    })
    .then(() => {
      console.log(`rates saved to db`);
    })
    .catch(err => {
      console.log(err);
    });
}

function flattenExchangeRates(rateObj, from, to) {
  const forward = `${from}_${to}`,
    backward = `${to}_${from}`;
  const { [forward]: fromTo, [backward]: toFrom } = rateObj;

  //flatten records
  const item1 = { title: forward, value: fromTo.val },
    item2 = { title: backward, value: toFrom.val };
  console.log(item1, item2);
  return [item1, item2];
}

// swap currencies ------------------------------------------------------------
function swapCurrencies(event) {
  event.preventDefault();

  // get select nodes
  const currFrom = document.querySelector("#currency-from"),
    currTo = document.querySelector("#currency-to");
  const { value: from } = currFrom,
    { value: to } = currTo;

  //swap & set values
  currFrom.value = to;
  currTo.value = from;
}

// starting the application
ready(app);
