// AWS Configuration for AquariSense

const awsConfig = {
  region: 'eu-central-1',
  
  Auth: {
    userPoolId: 'eu-central-1_rLVMgnjWd',
    userPoolWebClientId: '71njp0pl74nr8selc6pg12l8i',
  },
  
  API: {
    readings: 'https://0i944omjwf.execute-api.eu-central-1.amazonaws.com/readings',
    devices: 'https://afgkd2f1qh.execute-api.eu-central-1.amazonaws.com',
  },
  
  IoT: {
    endpoint: 'a18j3h78bct0td-ats.iot.eu-central-1.amazonaws.com',
  },
};

export default awsConfig;
