import { chromium } from 'playwright';

async function scrapeWeapon() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('正在访问武器页面...');
  await page.goto('https://wiki.skland.com/endfield/detail?mainTypeId=1&subTypeId=2&gameEntryId=70', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  console.log('等待页面加载...');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'tmp/weapon-page.png', fullPage: true });
  console.log('已保存截图到 tmp/weapon-page.png');
  
  const pageContent = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('=== 页面文本内容 ===');
  console.log(pageContent);
  
  await browser.close();
  
  return { pageContent };
}

scrapeWeapon()
  .then(() => {
    console.log('\n抓取完成！');
  })
  .catch(err => {
    console.error('抓取失败:', err);
    process.exit(1);
  });
