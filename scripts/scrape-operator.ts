import { chromium } from 'playwright';

async function scrapeOperator() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('正在访问页面...');
  await page.goto('https://wiki.skland.com/endfield/detail?mainTypeId=1&subTypeId=1&gameEntryId=7', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  console.log('等待页面加载...');
  await page.waitForTimeout(5000); // 等待 React 渲染
  
  // 截图以便调试
  await page.screenshot({ path: 'tmp/operator-page.png', fullPage: true });
  console.log('已保存截图到 tmp/operator-page.png');
  
  // 获取页面文本内容
  const pageContent = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('=== 页面文本内容 ===');
  console.log(pageContent);
  
  // 获取页面 HTML 结构（用于分析）
  const html = await page.content();
  
  await browser.close();
  
  return { pageContent, html };
}

scrapeOperator()
  .then(({ pageContent }) => {
    console.log('\n抓取完成！');
  })
  .catch(err => {
    console.error('抓取失败:', err);
    process.exit(1);
  });
