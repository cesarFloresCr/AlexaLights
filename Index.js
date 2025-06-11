const https = require('https'); // Asegurar que está importado


const deviceStates = {
  RiegoArriba: { powerState: "OFF" },
  RiegoAbajo: { powerState: "OFF" },
  RiegoAmbas: { powerState: "OFF" }
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
  }else if (request.directive.header.namespace === 'Alexa' && request.directive.header.name === 'ReportState'){
     log("DEBUG:", "ReportState Request", JSON.stringify(request));
     handleReportState(request, context);
  }

  //function handleReporState(request, context) {
    // Obtener el estado actual del dispositivo
  function handleReportState(request, context) {
    const endpointId = request.directive.endpoint.endpointId;
    const requestToken = request.directive.endpoint.scope.token;
    const powerState = deviceStates[endpointId].powerState;
    const response = {
      context: {
        properties: [
          {
            namespace: "Alexa.PowerController",
            name: "powerState",
            value: powerState,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          },
          {
            namespace: "Alexa.EndpointHealth",
            name: "connectivity",
            value: { value: "OK" },//modificar si se quiere hacer que esta o no conectado
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 0
          }
        ]
      },
      event: {
        header: {
          namespace: "Alexa",
          name: "StateReport",
          messageId: request.directive.header.messageId + "-R",
          correlationToken: request.directive.header.correlationToken,
          payloadVersion: "3"
        },
        endpoint: {
          scope: {
            type: "BearerToken",
            token: requestToken
          },
          endpointId: endpointId
        },
        payload:{}
      }
    };
    log("DEBUG", "Alexa.ReportState ", JSON.stringify(response));
    context.succeed(response);
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
                "manufacturerName": "Infected Device Company",
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
                "manufacturerName": "Infected Device Company",
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
                "manufacturerName": "Infected Device Company",
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
    responseHeader.payloadVersion = "3";
    responseHeader.correlationToken = request.directive.header.correlationToken;

    
    var requestToken = request.directive.endpoint.scope.token;
    var endpointId = request.directive.endpoint.endpointId;  // 📌 Identificar cuál botón se pulsó

    if (!deviceStates.hasOwnProperty(endpointId)) {
        context.fail("Endpoint desconocido: " + endpointId);
        return;
    }
    //swapping the power state
    if (requestMethod === "TurnOn") {
        deviceStates[endpointId].powerState = "ON";
//llmando a particle

        if(endpointId == "RiegoArriba" || endpointId == "RiegoAbajo" || endpointId == "RiegoAmbas"){
          try {
              const result = await callParticle(endpointId);
              console.log("Respuesta de particle",JSON.parse(result));
          } catch (err) {
              console.log("Error al llamar a Particle:", err);
          }   
}

    } else {
        deviceStates[endpointId].powerState = "OFF";
    }


    // 📌 Todos los botones envían un pulso sin cambiar estado
    log("DEBUG", `Alexa.PowerController - ${endpointId}: PULSADO`);

    // 📡 Opcional: Aquí puedes enviar la señal a un API/MQTT que controle el hardware real




    var contextResult = {
        "properties": [
            {
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": deviceStates[endpointId].powerState, //reports powerstate puede ser off directamente
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
