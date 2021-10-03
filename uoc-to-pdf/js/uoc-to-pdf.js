const pdfObjOptions = {
  pdfOpenParams: {
    navpanes: 0,
    toolbar: 1,
    statusbar: 0,
    view: "FitV"
  },
  forcePDFJS: true,
  /*PDFJS_URL: "PDF.js/web/viewer.html"*/
};

function fetch(metadataUrl) {
  const req = new XMLHttpRequest();
  req.open("GET", metadataUrl);
  req.overrideMimeType("text/xml")
  req.onreadystatechange = function () {
    if (req.readyState === 4 && req.status === 200) {
      update(req.responseXML);
    }
  };
  req.send(null);
}

function progressBarUpdater(bar) {
  bar.progressbar({value: 0})
  return function(c, t) {
    bar.progressbar({value: c, max: t})
  }
}

function update(metadata) {
  const pImages    = progressBarUpdater($("#progressbar1"))
  const pData      = progressBarUpdater($("#progressbar2"))
  const pDocPages  = progressBarUpdater($("#progressbar3"))
  const pDocImages = progressBarUpdater($("#progressbar4"))

  const dPages  = _.partial(deferPages, _, null)
  const dImages = _.partial(deferImages, _, pImages)
  const dData   = _.partial(deferData, _, pData)
  const dEmbed  = _.partial(deferEmbed, _)

  return dPages(metadata)
    .pipe(dImages)
    .pipe(dData)
    .pipe(data => {
      const dDocPages  = _.partial(deferDocPages, _, pDocPages)
      const dDocImages = _.partial(deferDocImages, _, data, pDocImages)
      return dDocPages(data).pipe(dDocImages)
    })
    .pipe(dEmbed)
}

function deferPages(metadata, limit) {
  return defer("pages", function () {
    let res = collectMetadata(metadata);
    return limit > 0 ? res.filter((elem, idx) => idx < limit) : res
  })
}


function deferImages(pages, cb) {
  const d = $.Deferred()
  const images = pages.map(page =>
    $('<img/>').attr('crossOrigin', 'anonymous').data(page)
  )
  let loaded = 0
  const updateFn = () => {
    loaded++
    if (cb) cb(loaded, images.length)
    if (loaded >= images.length) delay()(() => d.resolve(images))
  }
  images.forEach(image =>
    image.one("load", updateFn).attr('src', image.data().imageUrl)
  )
  return d.promise()
}

function deferData(images, cb) {
  function convert(image) {
    return {
      orientation: image.data().orientation,
      b64: getBase64Image(image[0])
    }
  }
  return deferEach("data", images, convert, cb)
}

function deferDocPages(data, cb) {
  return defer("docPages", function () {
    return data.reduce(
      (doc, datum, idx) => {
        if (cb) cb(idx + 1, data.length)
        return addPage(doc, "a4", datum.orientation)
      },
      null
    )
  })
}

function deferDocImages(doc, data, cb) {
  const d = $.Deferred()
  const ds = data.map((datum, idx) => {
    defer(`docImages-${idx}`, function () {
      if (cb) cb(idx + 1, data.length)
      doc.setPage(idx)
      doc.addImage(datum.b64, "JPEG", 0, 0, doc.getPageWidth(), doc.getPageHeight())
    })
  })
  delay(1)(() => {
    $.when.apply($.when, ds).then(() => d.resolve(doc))
  })
  return d.promise()
}

function deferEmbed(doc) {
  return defer("embed", function () {
    return PDFObject.embed(doc.output("bloburl"), "#preview-pane", pdfObjOptions);
  })
}

function addPage(doc, size, orientation) {
  if (doc == null)
    return new jsPDF({orientation: orientation, unit: "px"});
  else {
    doc.addPage(size, orientation);
    return doc
  }
}

function getBase64Image(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const dataURL = canvas.toDataURL("image/jpg");
  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}


// function update2(metadata) {
//   const pages = collectMetadata(metadata).filter(
//     (elem, idx) => idx < 5
//   )
//
//   // function allImagesLoaded() {
//   //   let doc = null
//   //   images.forEach(image => {
//   //     let page = image.data()
//   //     doc = addPage(doc, "a4", page.orientation)
//   //     doc.addImage(getBase64Image(image[0]), "JPEG", 0, 0, doc.getPageWidth(), doc.getPageHeight())
//   //   })
//   //   PDFObject.embed(doc.output("bloburl"), "#preview-pane", pdfObjOptions);
//   // }
//
//   const bar1 = $("#progressbar1")
//   bar1.progressbar({
//     max: pages.length,
//     complete: function () {
//       console.log("bar1: all done")
//     }
//   })
//
//   const incLoaded = progressBarUpdater(bar1)
//   const images = pages.map(page => {
//     return $('<img/>')
//       .one("load", incLoaded)
//       .attr('src', page.imageUrl)
//       .attr('crossOrigin', 'anonymous')
//       .data(page)
//   })
//
//   function deferedImageData(images) {
//     return defer(function () {
//       const bar = $("#progressbar2")
//       bar.progressbar({
//         max: images.length,
//         complete: function () {
//           console.log("bar2: complete")
//           showPdf(b64Data)
//         }
//       })
//       const dataLoaded = progressBarUpdater(bar)
//       images.map(image => {
//         const res = {
//           orientation: image.data().orientation,
//           b64: getBase64Image(image[0])
//         }
//         dataLoaded()
//         return res
//       })
//     })
//   }
//
//   function buildDoc(b64Data) {
//     return defer(function () {
//       let doc = null
//       const bar3 = $("#progressbar3")
//       bar3.progressbar({
//         max: images.length,
//         complete: function () {
//           PDFObject.embed(doc.output("bloburl"), "#preview-pane", pdfObjOptions);
//           console.log("bar3: all done")
//         }
//       })
//
//       const pageAdded = progressBarUpdater(bar3)
//       b64Data.forEach(data => {
//         doc = addPage(doc, "a4", data.orientation)
//         doc.addImage(data.b64, "JPEG", 0, 0, doc.getPageWidth(), doc.getPageHeight())
//         pageAdded()
//       })
//       return doc
//     })
//   }
//
//   PDFObject.embed(doc.output("bloburl"), "#preview-pane", pdfObjOptions);
// }

