import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
//import {getVectorContext} from 'ol/render.js';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import { buffer } from '@turf/buffer';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import dissolve from '@turf/dissolve';
import bezierSpline from '@turf/bezier-spline';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';

import {Draw, Modify, Snap} from 'ol/interaction';

import { Control } from 'ol/control'
import { getPointResolution } from 'ol/proj';
import jsPDF from 'jspdf';
import { Circle, Point, MultiPoint} from 'ol/geom';

//import * as pdfjsLib from 'pdfjs-dist/webpack';
//pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.js';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';

const init = () => {
  try {
    if (typeof window === 'undefined' || !('Worker' in window)) {
      throw new Error('Web Workers not supported in this environment.');
    }

    window.pdfjsWorker = pdfjsWorker;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (error) {
    console.log('Error', error);
  }
};
init();

import sampleFeatures from './sampleFeatures';
import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic';

proj4.defs("EPSG:3067","+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const geojsonFormat = new GeoJSON({featureProjection: 'EPSG:3067'});

const corridorize = (data) => ({
  type: 'FeatureCollection',
  features: data.features.map(feature => {
    switch ( feature.geometry.type ){
      case 'Point':
        return buffer(feature, feature.properties.width/2, {units: 'meters'})
      case 'LineString':
        return feature.properties.style === 'curved'
          ? buffer(bezierSpline(feature), feature.properties.width/2, {units: 'meters'})
          : buffer(feature, feature.properties.width/2, {units: 'meters'})
      default:
        return feature
      }
    })
})

const vectorSource = new VectorSource({
  features: geojsonFormat.readFeatures(dissolve(corridorize(sampleFeatures)))
})

const style = new Style({
  fill: new Fill({
    color: 'white',
    opacity: .1
  }),
});

const defaultVectorLayer = new VectorLayer({
  source: vectorSource,
  style: style
})
  // await fetch('sample.geojson')
  // .then(response => response.json())
  // .then(data => {
  //   // Process the loaded GeoJSON data
  //   const buffered = corridorize(data)

  //   const dissolved = dissolve(buffered)

  //   const features = geojsonFormat.readFeatures(dissolved);

  //   // Create a new vector source and layer
  //   return new VectorSource({
  //     features: features,
  //   });
  // });

const mapantSource = new XYZ({
  url: 'https://wmts.mapant.fi/wmts.php?z={z}&y={y}&x={x}',
  projection: 'EPSG:3067',
  tileGrid: new WMTSTileGrid({ //JHS180 TM35FIN tilegrid
    extent: [-548576.000000,6291456.000000,1548576.000000,8388608.000000],
    resolutions: [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5, 0.25],
    matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  }),
  crossOrigin: 'anonymous',
  attributions: 'Aineistot &copy; <a href="https://mapant.fi">MapAnt</a> ja <a href="https://www.maanmittauslaitos.fi/">MML</a>; Kehitysehdotukset <a href="https://github.com/jarvena/corridorO/issues">Github</a>'
});

const mapant = new TileLayer({
  source: mapantSource
});

const base = new TileLayer({
  className: 'base',
  source: mapantSource,
  opacity: 0.1
});

mapant.on('prerender', function (e) {
  e.context.globalCompositeOperation = 'source-atop';
});

mapant.on('postrender', function (e) {
  e.context.globalCompositeOperation = 'source-over'; // back to default
});

const vectorDrawingSource = new VectorSource()
const vectorDrawingLayer = new VectorLayer({
  source: vectorDrawingSource,
  style: {
    "fill-color": 'white'
  }
})
const corridorDrawingSource = new VectorSource()
const corridorDrawingLayer = new VectorLayer({
  source: corridorDrawingSource,
  style: {
    "fill-color": 'white',
    //"stroke-color": 'magenta',
    //"stroke-width": 2,
  }
})

class PrintMapControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = 'P';

    const element = document.createElement('div');
    element.className = 'print ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    button.addEventListener('click', this.handlePrint.bind(this), false);
  }

  handlePrint() {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    const button = this.element.children[0];
    button.disabled = true;
    document.body.style.cursor = 'progress';

    const format = 'A4';
    const resolution = '300';
    const scale = 10;
    const dim = [297, 210];
    const width = Math.round((dim[0] * resolution) / 25.4);
    const height = Math.round((dim[1] * resolution) / 25.4);
    const size = map.getSize();
    const viewResolution = map.getView().getResolution();

    const scaleResolution =
      scale /
      getPointResolution(
        map.getView().getProjection(),
        resolution / 25.4,
        map.getView().getCenter(),
      );

    map.once('rendercomplete', function () {
      const mapCanvas = document.createElement('canvas');
      mapCanvas.width = width;
      mapCanvas.height = height;
      const mapContext = mapCanvas.getContext('2d');
      Array.prototype.forEach.call(
        document.querySelectorAll('.ol-layer canvas, .base canvas'),
        function (canvas) {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity;
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
            const transform = canvas.style.transform;
            // Get the transform parameters from the style's transform matrix
            const matrix = transform
              .match(/^matrix\(([^\(]*)\)$/)[1]
              .split(',')
              .map(Number);
            // Apply the transform to the export map context
            CanvasRenderingContext2D.prototype.setTransform.apply(
              mapContext,
              matrix,
            );
            mapContext.drawImage(canvas, 0, 0);
          }
        },
      );
      mapContext.globalAlpha = 1;
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
      const pdf = new jsPDF('landscape', undefined, format);
      pdf.addImage(
        mapCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        dim[0],
        dim[1],
      );
      pdf.save('map.pdf');
      // Reset original map size
      map.setSize(size);
      map.getView().setResolution(viewResolution);
      button.disabled = false;
      document.body.style.cursor = 'auto';
      addInteractions();
    });

    // Set print size
    const printSize = [width, height];
    map.setSize(printSize);
    map.getView().setResolution(scaleResolution);
  }
}

const map = new Map({
  target: 'map',
  layers: [
    // new TileLayer({
    //   source: new OSM()
    // }),
    base,
    //vectorDrawingLayer,
    vectorDrawingLayer,
    corridorDrawingLayer,
    defaultVectorLayer,
    mapant,
    // new VectorLayer({ // Can be used to help the drawing process
    //   source: corridorDrawingSource,
    //   style: new Style({
    //     stroke: new Stroke({
    //       color: 'magenta',
    //       width: 2
    //     })
    //   })
    // }),
    new VectorLayer({
      className: 'drawings',
      source: vectorDrawingSource,
      zIndex: 10,
      style: [
        new Style({
          geometry: (feature) => {
            const coordinates = feature.getGeometry().getCoordinates();
            return new MultiPoint(coordinates);
          },
          image: new CircleStyle({
            radius: 5,
            stroke: new Stroke({
              color: 'white'
            }),
            fill: new Fill({
              color: [1,0,1,.3]
            })
          })
        }),
        new Style({
          stroke: new Stroke({
            color: [1,1,1,.3],
            lineDash: [5,5],
            width: 2
          }),
        })
      ]
    })
  ],
  view: new View({
    center: [364860, 6688850],
    zoom: 17,
    projection: 'EPSG:3067',
    maxZoom: 20
  })
});

map.addControl(new PrintMapControl)

const modify = new Modify({source: vectorDrawingSource});
map.addInteraction(modify);
let draw, snap
//const typeSelect = document.getElementById('type');

const addInteractions = () => {
  draw = new Draw({
    source: vectorDrawingSource,
    type: 'LineString',
  });
  map.addInteraction(draw);
  snap = new Snap({
    source: vectorDrawingSource
  });
  map.addInteraction(snap)
  // typeSelect.onchange = () => {
  //   map.removeInteraction(draw);
  //   map.removeInteraction(snap);
  //   addInteractions();
  // }
  draw.on('drawend', event => {
    const feature = event.feature;
    feature.setProperties({
      style: 'curved',
      width: 50,
    })
  })
}

addInteractions();

vectorDrawingSource.on('change', (e) => {
  const drawingFeatures = geojsonFormat.writeFeaturesObject(vectorDrawingSource.getFeatures());
  const corridorDrawing = corridorize(drawingFeatures)
  corridorDrawingSource.clear()
  corridorDrawingSource.addFeatures(geojsonFormat.readFeatures(corridorDrawing))
})

const pixelsToMeters = (pixels) => {
  const dpi = 300
  const mapScale = 10000
  return pixels * 0.0254 / dpi * mapScale
}

const computeExtent = ({height, width}) => {
  //const extent = map.getView().calculateExtent()
  console.log('height', height, width)
  const center = map.getView().getCenter()
  const extent = [
    center[0] - pixelsToMeters(width)/2,
    center[1] - pixelsToMeters(height)/2,
    center[0] + pixelsToMeters(width)/2,
    center[1] + pixelsToMeters(height)/2
  ]

  console.log('extentcomputed', extent)
  return extent
}

const readPdfMap = (pdfData) => {
  const pdfMap = pdfjsLib.getDocument({data: pdfData}) //'samplemap.pdf')
  console.log('pdfMap', pdfMap)
  console.log('pdfMap.promise', pdfMap.promise)
  pdfMap.promise.then(pdf => {
    console.log('pdf', pdf)
    pdf.getPage(1).then(page => {
      console.log('page', page)
      const viewport = page.getViewport({scale: 300/72});
      const mapCanvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height)); //document.createElement('canvas');
      const mapContext = mapCanvas.getContext('2d');
      // mapCanvas.width = Math.floor(viewport.width);
      // mapCanvas.height = Math.floor(viewport.height);
      console.log('viewport', viewport)
      console.log('mapCanvasheight', mapCanvas.height)
      page.render({
        canvasContext: mapContext,
        viewport: viewport,
      }).promise.then(() => {
        //const mapImage = mapCanvas.toDataURL('image/png');
        // const mapImage = createImageBitmap(mapCanvas).then(imageBitmap => {
        //   console.log('imageBitmap', imageBitmap)
        //   const a = document.createElement('a');
        //   a.href = URL.createObjectURL(new Blob([imageBitmap], { type: 'image/png' })); // or imageBitmap);
        //   a.download = 'mapImage.png';
        //   a.click();
        // })
        const mapImage = mapCanvas.convertToBlob();
        mapImage.then(imageBlob => {
          const a = document.createElement('a'); // For debugging to validate image creation
          a.href = URL.createObjectURL(new Blob([imageBlob], { type: 'image/png' })); // or imageBitmap);
          //a.download = 'mapImage.png';
          //a.click();
          const mapImageSource = new Static({
            url: a.href,
            crossOrigin: 'anonymous',
            imageExtent: computeExtent({width: mapCanvas.width, height: mapCanvas.height}) //map.getView().calculateExtent()
          })

          const staticImageLayer = new ImageLayer({
            source: mapImageSource,
          })

          const staticImageBase = new ImageLayer({
            source: mapImageSource,
            opacity: 0.1
          })

          map.addLayer(staticImageLayer)
          map.addLayer(staticImageBase)

          staticImageLayer.on('prerender', function (e) {
            e.context.globalCompositeOperation = 'source-atop';
          });
          staticImageLayer.on('postrender', function (e) {
            e.context.globalCompositeOperation = 'source-over'; // back to default
          });

          console.log('layers', map.getLayers())
          base.setZIndex(0)
          base.setVisible(false)
          staticImageBase.setZIndex(0)
          defaultVectorLayer.setZIndex(1)
          vectorDrawingLayer.setZIndex(1)
          corridorDrawingLayer.setZIndex(1)
          mapant.setZIndex(2)
          mapant.setVisible(false)
          staticImageLayer.setZIndex(3)
        })
        
      })
    })
  })
}

class PdfMapControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.innerHTML = '📂';

    const element = document.createElement('div');
    element.className = 'open-pdf ol-unselectable ol-control';
    element.appendChild(button);

    const inputElement = document.createElement('input');
    inputElement.style.display = 'none';
    inputElement.type = 'file';
    inputElement.accept = 'application/pdf';
    inputElement.addEventListener('change', (e) => {
      console.log('inputEvent', e)
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        readPdfMap(e.target.result)
      }
      reader.readAsArrayBuffer(file);
    });
    element.appendChild(inputElement);

    button.addEventListener('click', () => {
      inputElement.click();
    }, false);

    super({
      element: element,
      target: options.target,
    });
  }
}

map.addControl(new PdfMapControl)

//readPdfMap()