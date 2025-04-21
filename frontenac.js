require([
        "esri/Map",
        "esri/Basemap",
        "esri/views/MapView",
        "esri/widgets/BasemapToggle",
        "esri/layers/FeatureLayer",
        "esri/Graphic",
        "esri/layers/GraphicsLayer",
        "esri/layers/GeoJSONLayer",
        "esri/widgets/Legend",
        "esri/widgets/LayerList"
        //"esri/geometry/geometryEngine"
        ], function(Map, Basemap, MapView, BasemapToggle, FeatureLayer, Graphic, GraphicsLayer, GeoJSONLayer, Legend, LayerList) {
           //Before creating the map I created the layers.
          
          const parkGraphicsLayer = new GraphicsLayer({
            title: "Park Boundaries",
            listMode: "hide", // this hides the layer from the Legend
          });
          
          const paddleRouteLayer = new FeatureLayer({
            portalItem: {
              id: "5df40b4da2a04fbfb81f020b4038a0ef" //Id to my online layer.
            },
            popupTemplate: {  
              title: "{Route_Name}",
              content: "<b>Time estimated:</b> {EstimatedL} <br><b>Description:</b> {Descriptio} <br><b>Length:</b> {Length_m} m" 
            }
          });

          const trailLayer = new FeatureLayer({
            portalItem: {
              id: "bc87e4a44845403fb2b9759b7747921a"  //Trail layer inside the Frontenac Provincial Park. I intersected the Ontario network trail layer with the boundary of the park.
            },
            renderer: { // Adding new style.
              type: "simple",
              symbol: {
                type: "simple-line",
                style: "dot",
                color: [139, 69, 19, 0.7],  // SaddleBrown
                width: '1.5px'
                }
              },
              popupTemplate: {
              title: 'Name: {TRAIL_NAME}',
              content: '<b>Permitted:</b> {PERMITTED_} <br> <b>Description:</b> {descriptio}'
            }
          });
          
          const lakeLayers = new FeatureLayer({
            portalItem: {
              id: "02b0b0176273407c9bdb372d4a2f78a8"
            },
            title: "Lake",
            blendMode: "color-burn", //Blend the layer with the basemap, so the labels of the lakes are still visible. 
            listMode: "hide",//hide from the layerList
            legendEnabled: false, // hides from Legend
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-fill",
                color: [155,217,255, 0.3],  // color with transparency
                outline: {
                  color: [0, 100, 100, 0.5],
                  width: 0.5
                }
              }
            },
            popupEnabled: false
          })

          const wetlandsLayer = new FeatureLayer({
            portalItem: {
              id: "9121d311fada4ae49a4c065325b0ec16"   //wetlands inside the Frontenac Provincial Park. I intersected the Ontario wetland layer with the boundary of the park.
            },
            // minScale: 150000,
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-fill",
                color: [89,216,94, 0.5],  // Teal with transparency
                outline: {
                  color: [56,164,76, 0.6], //
                  width: 0.5
                }
              }
            },
              popupTemplate: {
              title: "<b>Wetland Type:</b> {WETLAND_TY}",
              content: [{
                type: "text",
                text: "<b>Area:</b> {expression/area_ha} ha", //add the expression in the content of the popup.                       
              }],
              expressionInfos: [{   //create an expression for convert m to ha.
                name: "area_ha", //name of the expression
                title: "Area in hectares",
                expression: "round($feature.SYSTEM_CAL / 10000, 2)" //converting m2 to ha.       
              }]
            }
          })

          const campsiteLayer = new GeoJSONLayer({ //I created a JSON document with campsites data.
            url: "https://raw.githubusercontent.com/afortisb/frontenac-campsites/refs/heads/main/campsiteCluster.json",  //I Hosted my GeoJSON file on Github so I copied the raw url here.
            title: "Campsite Cluster",
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-marker",
                style: "triangle",
                color: [255, 140, 0],
                size: 7,
                outline: {
                  color: [85, 45, 0], 
                  width: 0.5
                }
              }
            },
            popupTemplate: {
              title: 'Campsite Cluster #{cluster_id}',
              content: '<b>Elevation:</b> {elevation_m}m <br> <b>Description:</b> {description}'
            }
          })

          //Create the Map and add the FeatureLayer
          const map = new Map({
            basemap: new Basemap({
              portalItem: { //Online basemap
                id: "a52ab98763904006aa382d90e906fdd5" //Note: It has to be the webmap ID, not the layer id.
              }
            }),
            ground: "world-elevation",
            layers: [parkGraphicsLayer, lakeLayers, wetlandsLayer, paddleRouteLayer, trailLayer, campsiteLayer]
          });
        
          //Create the mapView.
          const view = new MapView({
            container: "viewDiv",
            map: map,
            center: [-76.50883450904897, 44.53976721171627], 
            zoom: 13
          });
          
          //Adding count of wetlands types for my popup
          //Query wetlands

          wetlandsLayer.queryFeatures({
            where: "1=1", //all wetlands.
            outFields: ["WETLAND_TY"]
          }).then((results) =>{

            const total = results.features.length;

            //Count wetland by type.
            const typeCounts = {}; //Empty Dict
            results.features.forEach(f => {
              const type = f.attributes.WETLAND_TY;
              typeCounts[type] = (typeCounts[type] || 0) + 1; //add the key and value(counts) to the dictionary typeCounts{}
            });
            
            // Create summary HTML
            let summary = `<b>Total wetlands:</b> ${total}<br><ul>` // <br> A line break. <ul> Starts an unordered list (bullet points).
            for(const [type, count] of Object.entries(typeCounts)) { //iterate the dictionary. key: type, value: count
              summary += `<li>${type}: ${count} </li>`;  //create a list in the popup for each line.
            }
            summary += "</ul>"; //closing the unordered list.

            //Wait until the map is ready.
            view.when(() => {
              const parkGraphic = parkGraphicsLayer.graphics.getItemAt(0); 
              if (parkGraphic) {
                //Popups open with custom title and content.
                view.openPopup({ //I'm overwriting the Provincial Park popup with wetland info.

                  location: parkGraphic.geometry.centroid,
                  title: `${parkGraphic.attributes.COMMON_SHORT_NAME} PROVINCIAL PARK`,
                  content:
                  `
                    <b>Park classification:</b> ${parkGraphic.attributes.PROVINCIAL_PARK_CLASS_ENG}<br>
                    <b>Area:</b> ${parkGraphic.attributes.REGULATED_AREA} ha<br>
                    <b>Year established:</b> ${parkGraphic.attributes.PROTDATE}<br>
                    ${summary}
                  `
                });
              }
            })
          });

          //query URL for Frontenac Provincial Park. JSON response
          fetch("https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/4/query?where=1%3D1&outFields=*&geometry=-76.798%2C44.455%2C-76.209%2C44.627&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=json")
            .then(response => response.json())
            .then(data => {
              const features = data.features.map(f => {
                return new Graphic({
                  geometry:{
                    type: 'polygon',
                    rings: f.geometry.rings,
                    spatialReference: {wkid: 4326}
                  },
                  attributes: f.attributes,
                  type: "simple",
                  symbol: { //customize symbology
                    type: "simple-fill",
                    color: [240, 255, 240, 0.15],  // Green with transparency.
                    outline: {
                      width: 1,
                      color: [34, 139, 34, 0.4]
                    }, 
                  },
                  copyright: "https://www.ontario.ca/page/open-government-licence-ontario",
                  //This creates the content of a popup for the featureLayer
                  popupTemplate: {
                    title: "{COMMON_SHORT_NAME} PROVINCIAL PARK",
                    content: "<b>Park Classification:</b> {PROVINCIAL_PARK_CLASS_ENG} <br><b>Area:</b> {REGULATED_AREA} ha <br><b>Year established:</b> {PROTDATE}" 
                  }
                })
              });  
                parkGraphicsLayer.addMany(features);
            });
          
            
          //add a basemap toggle
          const basemapToggle = new BasemapToggle({
            view: view,
            nextBasemap: "topo-vector"
          });

          view.ui.add(basemapToggle,"top-right");

          //Add a legend widget
          let legend = new Legend({
          view: view
          });
          //add it to the map
          view.ui.add(legend, "bottom-left");

          //Add a layer list widget
          const layerList = new LayerList({
            view: view
          });
          //Add widget
          view.ui.add(layerList, {
            position: "top-left"
          });

          view.ui.add(legend, "bottom-left");

          //event listener to filter parks dynamically
          //the document.getElementById() is to find the HTML element in the body section  with id='parkClass'
          document.getElementById("wetlandType").addEventListener("change", function(event) { //this addEventListener listen  when a user selects a new option.
            let selectedFilter = event.target.value; // gets the value of the selected option 
            wetlandsLayer.definitionExpression = selectedFilter; // Apply filter to the FeatureLayer
          });
        }
      );