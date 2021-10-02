
function collectMetadata(metadata) {
  let rootType = metadata.children[0].nodeName.toLowerCase();
  switch (rootType) {
    case 'ead':
      return collectEad(metadata);
    case 'tei':
      return collectTei(metadata);
    default   :
      error(`Unrecognized metadata type: ${rootType}`);
      return [];
  }
}


function collectEad(metadata) {
  // xq -c '.ead.archdesc.daogrp | map(select(."@role" == "download") | .daoloc[]) | last'
  return collect(
    orderedXpath(metadata, "/ead/archdesc/daogrp[@role='download']/daoloc"),
    page => {
      // noinspection JSUnresolvedVariable
      return {
        orientation: page.attributes.altrender.value,
        imageUrl: `https://images.lib.cam.ac.uk/content/images/${page.attributes.href.value}.jpg`
      }
    }
  )
}

function collectTei(metadata) {
  // xq -c '.TEI.facsimile.surface | map(.graphic | {orientation: ."@rend", imageUrl: ."@url"}) | last'
  return collect(
    orderedXpath(metadata, "/ns:TEI/ns:facsimile/ns:surface/ns:graphic"),
    page => {
      // noinspection JSUnresolvedVariable
      return {
        orientation: page.attributes.rend.value,
        imageUrl: `https://images.lib.cam.ac.uk/content/images/${page.attributes.url.value}.jpg`
      }
    }
  )
}

function collect(elements, fn) {
  let collected = [];
  for (let i = 0, length = elements.snapshotLength; i < length; ++i) {
    collected.push(fn(elements.snapshotItem(i)));
  }
  return collected;
}

function buildNsResolver(xml) {
  // see https://stackoverflow.com/questions/9621679/javascript-xpath-and-default-namespaces
  const nsResolver = xml.ownerDocument.createNSResolver(xml)
  const defaultNamespace = xml.getAttribute('xmlns');
  return function (prefix) {
    return nsResolver.lookupNamespaceURI(prefix) || defaultNamespace;
  }
}

function orderedXpath(xml, xpath) {
  const nsResolver = buildNsResolver(xml.documentElement);
  return xml.evaluate(xpath, xml, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
}

