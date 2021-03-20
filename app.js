const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=d703c033-833d-4722-b932-ae86a8f8d592"; // USE YOUR KEY HERE

async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllCenturies() {
  const url = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    localStorage.setItem("centuries", JSON.stringify(records));

    return records;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllClassifications() {
  const url = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

  if (localStorage.getItem("classification")) {
    return JSON.parse(localStorage.getItem("classification"));
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const records = data.records;
    localStorage.setItem("classification", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    $(".classification-count").text(`(${classifications.length})`);

    classifications.forEach(({ name }) => {
      $("#select-classification").append(
        `<option value="${name}">${name}</option>`
      );
    });

    $(".century-count").text(`(${centuries.length}))`);

    centuries.forEach(({ name }) => {
      $("#select-century").append(`<option value="${name}">${name}</option>`);
    });
  } catch (error) {
    console.error(error);
  }
}
async function buildSearchString() {
  return `${BASE_URL}/object?${KEY}&classification=${$(
    "#select-classification"
  ).val()}&century=${$("#select-century").val()}&&keyword=${$(
    "#keywords"
  ).val()}`;
}

$("#search").on("submit", async function (event) {
  // prevent the default
  event.preventDefault();
  onFetchStart();
  try {
    const url = await buildSearchString();
    const response = await fetch(encodeURI(url));
    const data = await response.json();
    updatePreview(data);
  } catch (error) {
    console.error();
  } finally {
    onFetchEnd();
  }
});

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

function renderPreview(record) {
  const { description, primaryimageurl, title } = record;

  return $(`
            <div class="object-preview">
            <a href="#">
            ${primaryimageurl ? `<img src="${primaryimageurl}" /> ` : ""} 
            ${title ? `<h3>${title}</h3>` : ""}  
            ${description ? `<h3>${description}</h3>` : ""} 
            </a>
            </div>
        `).data("record", record);
}

function updatePreview({ records, info }) {
  const root = $("#preview");
  const resultsElement = root.find(".results");
  resultsElement.empty();
  records.forEach((record) => resultsElement.append(renderPreview(record)));
  if (info.next) {
    $("#preview").find(".next").data("url", info.next);
    $("#preview").find(".next").attr("disabled", false);
  } else {
    $("#preview").find(".next").data("url", null);
    $("#preview").find(".next").attr("disabled", true);
  }
  if (info.prev) {
    $("#preview").find(".previous").data("url", info.prev);
    $("#preview").find(".previous").attr("disabled", false);
  } else {
    $("#preview").find(".previous").data("url", null);
    $("#preview").find(".previous").attr("disabled", true);
  }
}
$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  try {
    const url = $(this).data("url");
    const response = await fetch(url);
    const data = await response.json();
    updatePreview(data);
  } catch (error) {
    console.error;
  } finally {
    onFetchEnd();
  }
});
$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  const objectPreview = $(this).closest(".object-preview");
  $("#feature").empty();
  $("#feature").append(renderFeature(objectPreview.data("record")));
});

function renderFeature({
  title,
  dated,
  description,
  culture,
  style,
  technique,
  medium,
  dimensions,
  people,
  department,
  division,
  contact,
  creditline,
  images,
  primaryimageurl,
}) {
  const objecFeatureElement = $(`<div class="object-feature">

  <header>
    <h3>${title}</h3>
    <h4>${dated}</h4>
  </header>
  <section class="facts">
   ${factHTML("Description", description)}
   ${factHTML("Culture", culture, "culture")}
   ${factHTML("Style", style)}
   ${factHTML("Technique", technique, "technique")}
   ${factHTML("Medium", medium, "medium")}
   ${factHTML("Dimensions", dimensions)}
   ${
     people
       ? people
           .map(({ displayname }) => factHTML("Person", displayname, "person"))
           .join("")
       : ""
   }
   ${factHTML("Department", department)}
   ${factHTML("Division", division)}
   ${factHTML(
     "Contact",
     `<a target="_blank" href="mailto:${contact}">${contact}</a>`
   )}
   ${factHTML("Creditline", creditline)}
  </section>
  <section class="photos">
  ${photosHTML(images, primaryimageurl)}
</section>
    </div>`);
  return objecFeatureElement;
}
function searchURL(searchType, searchString) {
  return encodeURI(`${BASE_URL}/object?${KEY}&${searchType}=${searchString}`);
}

function factHTML(title, content, searchTerm = null) {
  if (!content) return "";
  if (!searchTerm)
    return `<span class=""title>${title}</span> <span class="content">${content}</span>`;
  return `<span class='title'>${title}</span> <span class="content"><a href=${searchURL(
    searchTerm,
    content
  )}>${content}</a></span>`;
}

function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    return images
      .map(({ baseimageurl }) => `<img src=${baseimageurl} >`)
      .join();
  } else if (primaryimageurl) {
    return `<img src=${primaryimageurl}>`;
  } else {
    return primaryimageurl;
  }
}

$("#feature").on("click", "a", async function (event) {
  const href = $(this).attr("href");

  if (href.startsWith("mailto")) {
    return;
  }
  event.preventDefault();
  onFetchStart();

  try {
    const response = await fetch(href);
    const data = await response.json();

    if (data.records && data.records.length > 0) {
      updatePreview(data);
    }
  } catch (error) {
    console.error;
  } finally {
    onFetchEnd();
  }
});

prefetchCategoryLists();
fetchObjects();
