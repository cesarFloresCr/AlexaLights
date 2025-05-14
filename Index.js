// -*- coding: utf-8 -*-

// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
// SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
// Licensed under the Amazon Software License (the "License")
// You may not use this file except in compliance with the License.
// A copy of the License is located at http://aws.amazon.com/asl/
//
// This file is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific
// language governing permissions and limitations under the License.

const https = require('https'); // Asegurar que está importado


var deviceStates = {
    "RiegoArriba": "OFF",
    "RiegoAbajo": "OFF",
    "RiegoAmbas": "OFF"
  };


exports.handler = function (request, context) {
  if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
      log("DEBUG:", "Discover request",  JSON.stringify(request));
      handleDiscovery(request, context, "");
  }
  else if (request.directive.header.namespace === 'Alexa.PowerController') {
      if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
          log("DEBUG:", "TurnOn or TurnOff Request", JSON.stringify(request));
          handlePowerControl(request, context);
      }
  }
  else if (request.directive.header.namespace === 'Alexa.Authorization' && request.directive.header.name === 'AcceptGrant') {
      handleAuthorization(request, context)
  }

  function handleAuthorization(request, context) {
      // Send the AcceptGrant response
      var payload = {};
      var header = request.directive.header;
      header.name = "AcceptGrant.Response";
      log("DEBUG", "AcceptGrant Response: ", JSON.stringify({ header: header, payload: payload }));
      context.succeed({ event: { header: header, payload: payload } });
  }


  function log(message, message1, message2) {
    console.log(message + message1 + message2);
}


async function callParticle(functionToCall){
    // Configuración del acceso a Particle*************************////////////////
    const particleAccessToken = process.env.PARTICLE_ACCESS_TOKEN;
    const particleDeviceId = process.env.PARTICLE_DEVICE_ID;
     

     // Crear los parámetros de la solicitud si es necesario
     const params = "";//cambiando para mejorar el codigo
          
     // Opciones de la solicitud
    const options = {
        hostname: 'api.particle.io',
        path: `/v1/devices/${particleDeviceId}/${functionToCall}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${particleAccessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(params) // Cadena vacía implica longitud cero
        },
        timeout: 30000 // Timeout en milisegundos (30 segundos)
    };
    
         // Crear la promesa para la solicitud HTTPS
         
           return new Promise((resolve, reject) => {
               const req = https.request(options, (res) => {
                   let responseData = '';
                   res.on('data', (chunk) => {
                       responseData += chunk;
                   });
                   res.on('end', () => {
                       resolve(responseData);
                   });
               });
   
               req.on('error', (e) => {
                   reject(e);
               });
   
               // Enviar los datos
               req.write(params);
               req.end();
           });
}

function handleDiscovery(request, context) {
    var payload = {
        "endpoints": [
            {
                "endpointId": "RiegoArriba",
                "manufacturerName": "Smart Device Company",
                "friendlyName": "Plantas Arriba",
                "description": "Válvula inteligente plantas Arriba",
                "displayCategories": ["LIGHT"],
                "capabilities": [
                    {
                        "type": "AlexaInterface",
                        "interface": "Alexa.PowerController",
                        "version": "3",
                        "properties": {
                            "supported": [{ "name": "powerState" }],
                            "retrievable": true
                        }
                    }
                ]
            },
            {
                "endpointId": "RiegoAbajo",
                "manufacturerName": "Smart Device Company",
                "friendlyName": "Plantas Abajo",
                "description": "Válvula inteligente plantas Arriba",
                "displayCategories": ["LIGHT"],
                "capabilities": [
                    {
                        "type": "AlexaInterface",
                        "interface": "Alexa.PowerController",
                        "version": "3",
                        "properties": {
                            "supported": [{ "name": "powerState" }],
                            "retrievable": true
                        }
                    }
                ]
            },
            {
                "endpointId": "RiegoAmbas",
                "manufacturerName": "Smart Device Company",
                "friendlyName": "Ambas Plantas",
                "description": "valvula inteligente de las plantas",
                "displayCategories": ["LIGHT"],
                "capabilities": [
                    {
                        "type": "AlexaInterface",
                        "interface": "Alexa.PowerController",
                        "version": "3",
                        "properties": {
                            "supported": [{ "name": "powerState" }],
                            "retrievable": true
                        }
                    }
                ]
            }
        ]
    };
    
    var header = {...request.directive.header};
    header.name = "Discover.Response";
    
    log("DEBUG", "Discovery Response: ", JSON.stringify({ header: header, payload: payload }));
    context.succeed({ event: { header: header, payload: payload } });
}

async function handlePowerControl(request, context) {
    var requestMethod = request.directive.header.name;
    
    var responseHeader = {...request.directive.header};
    responseHeader.namespace = "Alexa";
    responseHeader.name = "Response";


    responseHeader.messageId = responseHeader.messageId + "-R";
    
    var requestToken = request.directive.endpoint.scope.token;
    var endpointId = request.directive.endpoint.endpointId;  // 📌 Identificar cuál botón se pulsó

    if (!deviceStates.hasOwnProperty(endpointId)) {
        context.fail("Endpoint desconocido: " + endpointId);
        return;
    }

    // 📌 Todos los botones envían un pulso sin cambiar estado
    log("DEBUG", `Alexa.PowerController - ${endpointId}: PULSADO`);

    // 📡 Opcional: Aquí puedes enviar la señal a un API/MQTT que controle el hardware real

    if(endpointId == "RiegoArriba" || endpointId == "RiegoAbajo" || endpointId == "RiegoAmbas"){
        try {
            const result = await callParticle(endpointId);
            console.log("Respuesta de particle",JSON.parse(result));
        } catch (err) {
            console.log("Error al llamar a Particle:", err);
        }   
    }


    var contextResult = {
        "properties": [
            {
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": "OFF", // Simula el pulso momentáneo
                "timeOfSample": new Date().toISOString(),
                "uncertaintyInMilliseconds": 50
            },
            {
                "namespace": "Alexa.EndpointHealth",
                "name": "connectivity",
                "value": { "value": "OK" },
                "timeOfSample": new Date().toISOString(),
                "uncertaintyInMilliseconds": 0
            }
        ]
    };

    var response = {
        context: contextResult,
        event: {
            header: responseHeader,
            endpoint: {
                scope: {
                    type: "BearerToken",
                    token: requestToken
                },
                endpointId: endpointId // 📌 Responde según el botón presionado
            },
            payload: {}
        }
    };

    context.succeed(response);
}

};
