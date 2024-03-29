const pdfObjOptions = {
  pdfOpenParams: {
    navpanes: 1,
    toolbar: 1,
    statusbar: 1,
    view: "FitV"
  },
  forcePDFJS: true,
  /*PDFJS_URL: "PDF.js/web/viewer.html"*/
};

function progressBarUpdater(bar) {
  bar.progressbar({value: 0})
  return function(c, t) {
    bar.progressbar({value: c, max: t})
  }
}

function update(metadata, id) {
  const pImages    = progressBarUpdater($("#progressbar1"))
  const pData      = progressBarUpdater($("#progressbar2"))
  const pDocPages  = progressBarUpdater($("#progressbar3"))
  const pDocImages = progressBarUpdater($("#progressbar4"))

  const dPages  = _.partial(deferPages, _)
  const dFilter = _.partial(deferFilter, _)
  const dImages = _.partial(deferImages, _, pImages)
  const dData   = _.partial(deferData, _, pData)
  const dEmbed  = _.partial(deferEmbed, _, id)

  return dPages(metadata)
    .pipe(dFilter)
    .pipe(dImages)
    .pipe(dData)
    .pipe(data => {
      const dDocPages  = _.partial(deferDocPages, _, pDocPages)
      const dDocImages = _.partial(deferDocImages, _, data, pDocImages)
      return dDocPages(data).pipe(dDocImages)
    })
    .pipe(dEmbed)
}

function deferFilter(metadata) {
  $('#rangeContainer').show()
  let start = $('#docRangeStart');
  let stop = $('#docRangeStop');
  start.prop('defaultValue', 1)
  stop.prop('defaultValue', metadata.length)

  const d = $.Deferred()
  $('#submitRange').on('click', () => {
    const rStart = start.prop('value')
    const rStop = stop.prop('value')
    const res = metadata.filter((elem, idx) =>
      idx >= (rStart - 1) && idx < rStop
    )
    $('#progressContainer').show()
    $('#imageCount').text(` (${res.length})`)
    $('#submitRange').hide()
    d.resolve(res)
  })
  return d.promise()
}

function deferPages(metadata) {
  return defer("pages", _.partial(collectMetadata, metadata))
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

function asData(image) {
  return {
    orientation: image.data().orientation,
    imgData: getBase64Image(image.data().orientation, image[0])
  }
}

function deferData(images, cb) {
  return deferEach("data", images, asData, cb)
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

function asDocImage(doc, datum, idx) {
  doc.setPage(idx + 1)
  doc.addImage(datum.imgData, "JPEG", 0, 0)
  return doc
}

function deferDocImages(doc, data, cb) {
  const d = $.Deferred()
  const ds = data.map((datum, idx) => {
    defer(`docImages-${idx}`, function () {
      if (cb) cb(idx + 1, data.length)
      return asDocImage(doc, datum, idx)
    })
  })
  delay(1)(() => {
    $.when.apply($.when, ds).then(() => d.resolve(doc))
  })
  return d.promise()
}

function embedSave(doc, id) {
  return doc.output("save", {filename: `uoc-${id}.pdf`})
}

function embedView(doc, id) {
  let blob = doc.output("bloburl", {filename: `uoc-${id}.pdf`})
  return PDFObject.embed(blob, "#preview-pane", pdfObjOptions);
}

function deferEmbed(doc, id) {
  const d = $.Deferred()
  $('#typeContainer').show()
  $('#submitType').on('click', () => {
    let embedType = $('input[name=typeRadio]:checked', '#typeSet').val();
    switch (embedType) {
      case 'view': d.resolve(embedView(doc, id)); break;
      case 'save': d.resolve(embedSave(doc, id)); break;
      default:
        console.error(`Unknown embed type: ${embedType}`)
        d.reject()
        break;
    }
  })
  return d.promise()
}

function addPage(doc, format, orientation) {
  return doc == null ?
    new jsPDF({format: format, orientation: orientation, unit: "pt"}) :
    doc.addPage(format, orientation);
}

function getBase64Image(orientation, img) {
  const pageSize = jsPDF.getPageSize(orientation, "px", "a4")
  const canvas   = document.createElement("canvas");
  canvas.width   = Math.ceil(pageSize.width);
  canvas.height  = Math.ceil(pageSize.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}
