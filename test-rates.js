// Teste rápido das taxas
async function testRates() {
  try {
    console.log('🔄 Testando APIs do Banco Central...');
    
    const [selicRes, cdiRes, ipcaRes] = await Promise.all([
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json')
    ]);

    const selicData = await selicRes.json();
    const cdiData = await cdiRes.json();
    const ipcaData = await ipcaRes.json();

    console.log('📊 Dados recebidos:');
    console.log('Selic:', selicData);
    console.log('CDI:', cdiData);
    console.log('IPCA (primeiros 3):', ipcaData.slice(0, 3));

    // Processar
    const selicAnual = parseFloat(selicData[0]?.valor) / 100;
    const cdiAnual = parseFloat(cdiData[0]?.valor) / 100;
    
    const ipcaAcumulado = ipcaData.reduce((acc, item) => {
      const valor = parseFloat(item.valor) / 100;
      return acc * (1 + valor);
    }, 1) - 1;

    console.log('🎯 Taxas processadas:');
    console.log('Selic:', selicAnual, '=', (selicAnual * 100).toFixed(2) + '%');
    console.log('CDI:', cdiAnual, '=', (cdiAnual * 100).toFixed(2) + '%');
    console.log('IPCA:', ipcaAcumulado, '=', (ipcaAcumulado * 100).toFixed(2) + '%');
    
    // CDB
    const cdbRate = cdiAnual * 1.15;
    console.log('CDB 115% CDI:', cdbRate, '=', (cdbRate * 100).toFixed(2) + '%');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testRates();
