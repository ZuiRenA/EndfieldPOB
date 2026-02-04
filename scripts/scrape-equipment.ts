/**
 * 装备抓取脚本 - 抓取金色品质装备数据
 * 
 * 使用方法: npx tsx scripts/scrape-equipment.ts
 */

import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface EquipmentData {
  id: string;
  name: string;
  quality: string;
  slot: string;
  setName: string;
  setId: string;
  baseStats: Record<string, string>;
  refineData: Record<string, {
    base: string;
    level1: string;
    level2: string;
    level3: string;
  }>;
  setEffect: string[];
  gameEntryId: number;
}

interface SetData {
  id: string;
  name: string;
  effect: string[];
  equipment: string[];
}

// 金色品质装备列表
const GOLD_EQUIPMENT = [
  "长息辅助臂", "长息护手·壹型", "长息护手", "长息蓄电核", "长息蓄电核·壹型", "长息装甲",
  "浊流切割炬", "悬河供氧栓", "潮涌手甲", "落潮轻甲",
  "50式应龙短刃·壹型", "50式应龙短刃", "50式应龙雷达", "50式应龙护手·壹型", "50式应龙护手", "50式应龙轻甲", "50式应龙重甲",
  "M.I.警用刺刃·壹型", "M.I.警用刺刃", "M.I.警用工具组", "M.I.警用瞄具", "M.I.警用臂环", "M.I.警用手环·壹型", "M.I.警用手环", "M.I.警用手套", "M.I.警用罩衣·贰型", "M.I.警用罩衣·壹型", "M.I.警用罩衣", "M.I.警用护甲",
  "动火用电力匣", "动火用测温镜", "动火用储能匣", "动火用手甲·壹型", "动火用手甲", "动火用外骨骼",
  "轻超域稳定盘", "轻超域分析环", "轻超域护手", "轻超域护板",
  "拓荒增量供氧栓", "拓荒通信器·壹型", "拓荒通信器", "拓荒耐蚀手套", "拓荒护甲·叄型", "拓荒护甲·贰型", "拓荒护甲·壹型", "拓荒护甲",
  "脉冲式校准器", "脉冲式手套", "脉冲式干扰服",
  "碾骨小雕像·壹型", "碾骨小雕像", "碾骨面具·壹型", "碾骨面具", "碾骨披巾·壹型", "碾骨披巾", "碾骨重护甲·壹型", "碾骨重护甲",
  "生物辅助护盾针", "生物辅助护板", "生物辅助接驳器·壹型", "生物辅助接驳器", "生物辅助手甲", "生物辅助臂甲", "生物辅助胸甲", "生物辅助重甲",
  "点剑火石", "点剑战术手甲", "点剑战术手套", "点剑重装甲",
  "纾难识别牌", "纾难识别牌·壹型", "纾难印章", "纾难印章·壹型"
];

// 套装映射
const SET_MAPPING: Record<string, string> = {
  "长息装备组": "changxi",
  "潮涌装备组": "chaoyong",
  "50式应龙装备组": "50shi-yinglong",
  "M.I.警用装备组": "mi-jingyong",
  "动火用装备组": "donghuoyong",
  "轻超域装备组": "qing-chaoyu",
  "拓荒装备组": "tuohuang",
  "脉冲式装备组": "maichongshi",
  "碾骨装备组": "niangu",
  "生物辅助装备组": "shengwu-fuzhu",
  "点剑装备组": "dianjian",
  "纾难装备组": "shunan"
};

function nameToId(name: string): string {
  // 简单的拼音映射
  const pinyinMap: Record<string, string> = {
    "长息": "changxi",
    "辅助臂": "fuzhubi",
    "护手": "hushou",
    "蓄电核": "xudianahe",
    "装甲": "zhuangjia",
    "浊流": "zhuoliu",
    "切割炬": "qiegejv",
    "悬河": "xuanhe",
    "供氧栓": "gongyangshuan",
    "潮涌": "chaoyong",
    "手甲": "shoujia",
    "落潮": "luochao",
    "轻甲": "qingjia",
    "应龙": "yinglong",
    "短刃": "duanren",
    "雷达": "leida",
    "重甲": "zhongjia",
    "警用": "jingyong",
    "刺刃": "ciren",
    "工具组": "gongjuzu",
    "瞄具": "miaoyu",
    "臂环": "bihuan",
    "手环": "shouhuan",
    "手套": "shoutao",
    "罩衣": "zhaoyi",
    "护甲": "hujia",
    "动火用": "donghuoyong",
    "电力匣": "dianlixia",
    "测温镜": "cewenjing",
    "储能匣": "chunengxia",
    "外骨骼": "waiguge",
    "轻超域": "qingchaoyu",
    "稳定盘": "wendingpan",
    "分析环": "fenxihuan",
    "护板": "huban",
    "拓荒": "tuohuang",
    "增量": "zengliang",
    "通信器": "tongxinqi",
    "耐蚀": "naishi",
    "脉冲式": "maichongshi",
    "校准器": "xiaozhunqi",
    "干扰服": "ganraofu",
    "碾骨": "niangu",
    "小雕像": "xiaodiaoxiang",
    "面具": "mianju",
    "披巾": "pijin",
    "重护甲": "zhonghujia",
    "生物辅助": "shengwufuzhu",
    "护盾针": "hudunzhen",
    "接驳器": "jieboqi",
    "臂甲": "bijia",
    "胸甲": "xiongjia",
    "点剑": "dianjian",
    "火石": "huoshi",
    "战术": "zhanshu",
    "纾难": "shunan",
    "识别牌": "shibiepai",
    "印章": "yinzhang"
  };
  
  let id = name;
  // 移除型号标记
  id = id.replace(/·[壹贰叄肆伍陆柒捌玖]型/g, '');
  
  // 转为小写拼音
  for (const [cn, py] of Object.entries(pinyinMap)) {
    id = id.replace(cn, py + '-');
  }
  
  // 清理
  id = id.replace(/50式/g, '50shi-');
  id = id.replace(/M\.I\./g, 'mi-');
  id = id.replace(/-+/g, '-');
  id = id.replace(/^-|-$/g, '');
  id = id.toLowerCase();
  
  // 添加型号后缀
  if (name.includes('·壹型')) id += '-1';
  else if (name.includes('·贰型')) id += '-2';
  else if (name.includes('·叄型')) id += '-3';
  
  return id;
}

async function scrapeEquipmentDetail(page: Page, gameEntryId: number): Promise<EquipmentData | null> {
  const url = `https://wiki.skland.com/endfield/detail?mainTypeId=1&subTypeId=4&gameEntryId=${gameEntryId}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const data = await page.evaluate(() => {
      const pageTitle = document.title;
      const name = pageTitle.split(' - ')[0];
      
      if (!name || name === '森空岛') return null;
      
      let quality = '', slot = '', setName = '';
      const allText = document.body.innerText;
      const lines = allText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '品质' && lines[i+1]) {
          quality = lines[i+1].trim();
        }
        if (line === '部位' && lines[i+1]) {
          slot = lines[i+1].trim();
        }
        if (line === '装备套组' && lines[i+1]) {
          setName = lines[i+1].trim();
        }
      }
      
      // 基础属性 - 只从装备属性表格获取
      const baseStats: Record<string, string> = {};
      const tables = document.querySelectorAll('table');
      let foundAttrTable = false;
      
      tables.forEach(table => {
        // 跳过精锻表格和推荐表格
        const headerText = table.querySelector('tr')?.textContent || '';
        if (headerText.includes('精锻') || headerText.includes('推荐')) return;
        if (foundAttrTable) return;
        
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          for (let i = 0; i < cells.length; i += 2) {
            const key = cells[i]?.textContent?.trim();
            const val = cells[i+1]?.textContent?.trim();
            // 只接受有效的属性名
            const validAttrs = ['防御力', '生命值', '攻击力', '力量', '敏捷', '智识', '意志', 
              '暴击率', '暴击伤害', '终结技充能效率', '技能伤害', '普通攻击伤害', '战技伤害',
              '灼热伤害', '冰冷伤害', '腐蚀伤害', '电击伤害', '物理伤害'];
            if (key && val && validAttrs.some(a => key.includes(a))) {
              baseStats[key] = val;
              foundAttrTable = true;
            }
          }
        });
      });
      
      // 精锻数据
      const refineData: Record<string, any> = {};
      tables.forEach(table => {
        const headerRow = table.querySelector('tr');
        if (headerRow?.textContent?.includes('精锻1级')) {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, idx) => {
            if (idx === 0) return;
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              const attrName = cells[0]?.textContent?.trim();
              if (attrName && !attrName.includes('精锻积累')) {
                refineData[attrName] = {
                  base: cells[1]?.textContent?.trim(),
                  level1: cells[2]?.textContent?.trim(),
                  level2: cells[3]?.textContent?.trim(),
                  level3: cells[4]?.textContent?.trim()
                };
              }
            }
          });
        }
      });
      
      // 套装效果
      const setEffect: string[] = [];
      const paragraphs = document.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent?.trim();
        if (text?.includes('件套组效果')) {
          setEffect.push(text);
        }
      });
      
      return { name, quality, slot, setName, baseStats, refineData, setEffect };
    });
    
    if (!data || !data.name) return null;
    
    return {
      id: nameToId(data.name),
      name: data.name,
      quality: data.quality,
      slot: data.slot,
      setName: data.setName,
      setId: SET_MAPPING[data.setName] || '',
      baseStats: data.baseStats,
      refineData: data.refineData,
      setEffect: data.setEffect,
      gameEntryId
    };
  } catch (error) {
    console.error(`Error scraping gameEntryId ${gameEntryId}:`, error);
    return null;
  }
}

async function findGoldEquipmentIds(page: Page): Promise<number[]> {
  // 先收集所有金色装备的gameEntryId
  // 通过遍历可能的ID范围来查找
  const ids: number[] = [];
  
  console.log('Scanning for gold equipment IDs...');
  
  // 装备ID范围大概在1000-1200之间
  for (let id = 1000; id <= 1200; id++) {
    const url = `https://wiki.skland.com/endfield/detail?mainTypeId=1&subTypeId=4&gameEntryId=${id}`;
    
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(300);
      
      const title = await page.title();
      const name = title.split(' - ')[0];
      
      if (name && name !== '森空岛' && GOLD_EQUIPMENT.includes(name)) {
        console.log(`Found: ${name} (ID: ${id})`);
        ids.push(id);
      }
    } catch (error) {
      // 页面不存在，跳过
    }
    
    // 每10个ID输出进度
    if (id % 20 === 0) {
      console.log(`Progress: ${id}/1200, found ${ids.length} equipment`);
    }
    
    // 找到74个就停止
    if (ids.length >= 74) break;
  }
  
  return ids;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Starting equipment scrape...');
  
  // 1. 查找所有金色装备的ID
  const equipmentIds = await findGoldEquipmentIds(page);
  console.log(`Found ${equipmentIds.length} gold equipment IDs`);
  
  // 2. 抓取每个装备的详细数据
  const allEquipment: EquipmentData[] = [];
  const sets: Record<string, SetData> = {};
  
  for (const id of equipmentIds) {
    const data = await scrapeEquipmentDetail(page, id);
    if (data) {
      allEquipment.push(data);
      console.log(`Scraped: ${data.name}`);
      
      // 整理套装数据
      if (data.setId && !sets[data.setId]) {
        sets[data.setId] = {
          id: data.setId,
          name: data.setName,
          effect: data.setEffect,
          equipment: []
        };
      }
      if (data.setId) {
        sets[data.setId].equipment.push(data.id);
      }
    }
  }
  
  // 3. 保存数据
  const outputDir = path.join(__dirname, '../resources/equipment');
  const setsDir = path.join(outputDir, 'sets');
  
  // 确保目录存在
  if (!fs.existsSync(setsDir)) {
    fs.mkdirSync(setsDir, { recursive: true });
  }
  
  // 按套装分组保存
  for (const [setId, setData] of Object.entries(sets)) {
    const setEquipment = allEquipment.filter(e => e.setId === setId);
    const setFile = {
      set: setData,
      equipment: setEquipment.map(e => ({
        id: e.id,
        name: e.name,
        slot: e.slot,
        baseStats: e.baseStats,
        refineData: e.refineData,
        gameEntryId: e.gameEntryId
      }))
    };
    
    fs.writeFileSync(
      path.join(setsDir, `${setId}.json`),
      JSON.stringify(setFile, null, 2),
      'utf-8'
    );
    console.log(`Saved set: ${setId}`);
  }
  
  // 保存完整索引
  fs.writeFileSync(
    path.join(outputDir, 'index.json'),
    JSON.stringify({
      totalCount: allEquipment.length,
      sets: Object.keys(sets),
      equipment: allEquipment.map(e => ({
        id: e.id,
        name: e.name,
        setId: e.setId,
        slot: e.slot
      }))
    }, null, 2),
    'utf-8'
  );
  
  console.log(`\nDone! Scraped ${allEquipment.length} equipment in ${Object.keys(sets).length} sets.`);
  
  await browser.close();
}

main().catch(console.error);
