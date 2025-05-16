import math
import os.path
import re
import sys
import time
import json
import csv
from pathlib import Path

from selenium import webdriver
from selenium.common import NoSuchElementException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common import NoSuchElementException, TimeoutException

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)

# 原版github地址：https://github.com/Xayanium/Steam-Data-Analysis
# 在原本的项目代码中，爬虫逻辑直接将csv爬取出并保存到mysql数据库中
# 此次课设使用hive直接存储分析，对爬虫py做修改，将mysql部分去除，只保留爬虫逻辑，将数据保存到csv文件
# 代码大致逻辑：
# 1. 爬取搜索页面信息：爬取steam首页的搜索结果页面，获取搜索页面就可以获取到的数据以及gamelist
# 2. 爬取详情页面信息：对gamelist的每个数据遍历，通过爬取到的游戏详情页面url来爬取详情数据
# 3. 数据保存：将爬取到的数据保存到csv文件。
# 代码实现：
# 在原本的Spider类中封装了多个函数，主要实现了chrome的渲染启动，页面滚动，数据爬取，将数据以类元素的方式存储（但实际并没有用到）
# 爬虫启动接口process_spider通过参数初始化一个Spider对象，并调用spider_search_page或者spider_detail_page函数，传入参数，进行爬取。
# 函数逻辑：
# 1. 爬取搜索页数据：爬取一个搜索页的数据，返回一个list字典，每个字典代表一个游戏，返回一个字典list
# 2. 爬取详情页数据：爬取一个详情页的数据，返回一个字典，每个字典代表一个游戏，返回一个字典
# 最终将list中的数据挨个拼接，得到将爬取到的数据保存到csv文件，对所需的页数作遍历即可完成爬虫操作

class Spider(object):
    def __init__(self, id, spider_url, title):
        self.spider_url = spider_url
        self.id = id
        self.root_path = Path(__file__).parent.parent.resolve()
        # self.conf_path = os.path.join(self.root_path, 'config.json')
        self.driver = self.start_browser()
        # self.type_list = None
        # self.description = None
        # self.description = None
        # self.developer = None
        # self.publisher = None
        # self.image_links = None
        # self.video_link = None
        # self.spider_result_list = None
        self.title = title

    def start_browser(self):
        option = webdriver.ChromeOptions()
        option.add_experimental_option('debuggerAddress', '127.0.0.1:9222')
        # print("连接到chrome浏览器")
        option.page_load_strategy = 'none'
        option.add_argument("--headless")  # 无头模式
        option.add_argument("--disable-gpu")
        option.add_argument("--no-sandbox")
        option.add_argument("--disable-extensions")  # 禁用扩展，减少加载时间
        option.add_argument("--disable-images")  # 禁用图片加载，减少流量
        option.add_argument("--mute-audio")  # 禁用音频
        option.add_argument("--disable-media-stream")  # 禁用媒体流（如视频和直播）
        option.add_argument("--autoplay-policy=no-user-gesture-required")  # 禁用自动播放
        option.add_argument("--disable-bundled-ppapi-flash")  # 禁用 Flash
        option.add_argument("--disable-javascript")  # 禁用 JavaScript，减少动态内容加载
        
        # 直接指定本地 ChromeDriver 路径
        # ChromeDriver安装教程：https://blog.csdn.net/weixin_45109684/article/details/117650036
        chromedriver_path = r"C:\Program Files\Google\Chrome\Application\chromedriver.exe"
        service = Service(chromedriver_path)
        driver = webdriver.Chrome(service=service, options=option)
        # 自动检测ChromeDriver版本并下载（会延长爬取时间，建议根据浏览器版本自行下载）
        # service = Service(ChromeDriverManager().install())  # 使用 webdriver-manager 自动下载和管理 Chromedriver
        # driver = webdriver.Chrome(service=service, options=option)
        driver.implicitly_wait(1.5)  # 设置隐式等待3秒
        driver.get(self.spider_url)
        # print("浏览器已启动")
        return driver

    # 爬取搜索页数据:爬取一个搜索页的数据
    # 返回list字典
    def spider_search_page(self):
        datalist_search = []
        game_list = self.driver.find_elements(by=By.XPATH, value="//a[contains(@class, 'search_result_row')]")
        for game in game_list:
            title = game.find_element(by=By.XPATH, value=".//span[@class='title']").text
            # icon = game.find_element(by=By.XPATH, value=".//img").get_attribute('src')
            release_date = game.find_element(by=By.XPATH, value=".//div[contains(@class, 'search_released')]").text
            try:
                review_summary = game.find_element(
                    by=By.XPATH,
                    value=".//span[contains(@class, 'search_review_summary')]"
                ).get_attribute('data-tooltip-html').replace('<br>', ' ')
            except Exception:
                review_summary = ''
            detail_link = game.get_attribute('href')
            platform_list = game.find_elements(
                by=By.XPATH, value="./div[2]//span[contains(@class, 'platform_img')]"
            )
            _platform = []
            for x in platform_list:
                if re.search('win', x.get_attribute('class')):
                    _platform.append(re.search('win', x.get_attribute('class')).group())
                elif re.search('mac', x.get_attribute('class')):
                    _platform.append(re.search('mac', x.get_attribute('class')).group())
                elif re.search('linux', x.get_attribute('class')):
                    _platform.append(re.search('linux', x.get_attribute('class')).group())

            try:
                final_price = re.search(
                    r"[\d.,]+",
                    game.find_element(by=By.XPATH, value=".//div[contains(@class, 'discount_final_price')]").text
                ).group()
            except Exception:
                final_price = 0

            try:
                discount = 100 - int(re.search(
                    r"\d+", game.find_element(by=By.XPATH, value=".//div[@class='discount_pct']").text
                ).group())
                original_price = float(re.search(
                    r"[\d.,]+",
                    game.find_element(
                        by=By.XPATH,
                        value=".//div[contains(@class, 'discount_original_price')]"
                    ).text
                ).group())
            except Exception:
                discount = 0
                original_price = final_price
            
            datalist_search.append({
                'title': title,
                # 'icon': icon,
                # 'platform': _platform,
                'release_date': release_date,
                'review_summary': review_summary,
                'discount': discount,
                'original_price': original_price,
                'final_price': final_price,
                'detail_link': detail_link
            })
            print(title+' 搜索页数据爬取成功')
        return datalist_search

    # 模拟滚轮刷新页面
    # def scroll(self):
    #     st_pos = 0
    #     ed_pos = 5000
    #     step = 2000
    #     while st_pos < ed_pos:
    #         scroll_script = f"window.scrollBy(0, {step})"
    #         self.driver.execute_script(scroll_script)
    #         st_pos += step
    #         time.sleep(0.1)

    # 爬取详情页数据
    def spider_detail_page(self):
        try:
            # 使用显式等待确保页面加载完成
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[@class='glance_ctn']"))
            )
        except TimeoutException:
            print("页面加载超时，未找到元素")
            return {}
        # self.start_browser()
        datalist_detail = {}
        # self.scroll()
        box = self.driver.find_element(By.XPATH, value="//div[@class='glance_ctn']")
        type_list = [
            x.text for x in box.find_elements(by=By.XPATH, value=".//*[@class='glance_tags popular_tags']/a") if x.text
        ]
        # try:
        #     description = box.find_element(by=By.XPATH, value=".//div[@class='game_description_snippet']").text
        # except NoSuchElementException:
        #     description = 'No Review'
        try:
            developer = box.find_elements(by=By.XPATH, value=".//div[@class='summary column']/a")[0].text
        except IndexError:
            developer = ''
            
        try:
            publisher = box.find_elements(by=By.XPATH, value=".//div[@class='summary column']/a")[1].text
        except IndexError:
            publisher = ''

        # try:
        #     image_link = box.find_element(by=By.XPATH, value=".//img").get_attribute('src')
        # except NoSuchElementException:
        #     image_link = ''

        # box = self.driver.find_element(by=By.XPATH, value="//div[@class='highlight_ctn']")
        # try:
        #     video_link = box.find_element(by=By.XPATH, value=".//video").get_attribute('src')
        # except NoSuchElementException:
        #     video_link = ''

        # box = self.driver.find_element(by=By.XPATH, value="//div[@class='sysreq_contents']")
        # lowest_req = [
        #     x.text
        #     for x in box.find_elements(by=By.XPATH, value=".//div[@class='game_area_sys_req_leftCol']//li")
        #     if x.text
        # ]
        # if not len(lowest_req):
        #     lowest_req = [
        #         x.text
        #         for x in box.find_elements(by=By.XPATH, value=".//div[@class='game_area_sys_req_full']//li")
        #         if x.text
        #     ]
        # suggest_req = [
        #     x.text
        #     for x in box.find_elements(by=By.XPATH, value=".//div[@class='game_area_sys_req_rightCol']//li")
        #     if x.text
        # ]
        # sys_requirements = [lowest_req, suggest_req]

        # try:
        #     box = self.driver.find_element(by=By.XPATH, value="//div[@id='Reviews_summary']")
        #     review_list = [
        #         x.text
        #         for x in box.find_elements(by=By.XPATH, value="(.//div[@class='content'])[position()<=8]")
        #         if x.text
        #     ]
        # except Exception:
        #     review_list = []

        datalist_detail = {
            'type_list': type_list,
            # 'description': description,
            'developer': developer,
            'publisher': publisher,
            # 'image_link': image_link,
            # 'video_link': video_link,
            # 'review_list': review_list,
            # 'sys_requirements': sys_requirements,
        }
        return datalist_detail


def process_spider(args: dict, platform):
    try:
        spider = Spider(args['id'], args['url'], args['title'])
        if args['method'] == 'spider_search_page':
            return spider.spider_search_page()
        elif args['method'] == 'spider_detail_page':
            return spider.spider_detail_page()
        print('finish one spider task')
    except Exception as e:
        print('spider pages error: ', e)
    # spider = Spider(args['id'], args['url'], args['title'])
    # if args['method'] == 'spider_search_page':
    #     spider.spider_search_page()
    # elif args['method'] == 'spider_detail_page':
    #     spider.spider_detail_page()
    # spider.save_to_databases(args['method'], platform)
    # print('finish one spider task')
    
def saveAsCSV(item):
    # 打开或创建 game.csv 文件并写入数据
    with open('../data/game.csv', 'a', encoding='utf-8-sig', newline='') as csvfile:
        writer = csv.writer(csvfile)
        
        # 写入表头（仅在文件为空时）
        if csvfile.tell() == 0:
            header = ['title', 'release_date', 'review_summary', 'discount', 'original_price', 'final_price', 'type_list', 'developer', 'publisher']
            writer.writerow(header)
        
        # 写入数据行
        writer.writerow([
            item.get('title'),
            # item.get('icon'),
            # ','.join(item.get('platform', [])),
            item.get('release_date'),
            item.get('review_summary'),
            item.get('discount'),
            item.get('original_price'),
            item.get('final_price'),
            # item.get('detail_link'),
            ','.join(item.get('type_list', [])),
            # item.get('description'),
            item.get('developer'),
            item.get('publisher'),
            # item.get('image_link'),
            # item.get('video_link'),
            # ','.join(item.get('review_list', [])),
            # '|'.join([','.join(req) for req in item.get('sys_requirements', [])])
        ])

if __name__ == '__main__':
    # 基础选项：
    # clean：0-不清理，1-清理
    # startPage：爬取起始页
    # endPage：爬取终止页
    current_platform = sys.platform  # 检测当前运行的平台
    st_time = time.time()
    clean = 0 # 是否清理缓存文件 
    if(clean == 1):
        if os.path.exists('../data/game.csv'):  # 清理之前的csv缓存文件
            os.remove('../data/game.csv')

    startPage = 250 # 爬取起始页
    endPage = 3000 # 爬取终止页
    gameNum = 0 # 爬取游戏数量
    for i in range(startPage,endPage+1):
        print('-------------')
        print(f'正在爬取第{i}页')
        print('-------------')
        target = f'https://store.steampowered.com/search/?page={i}&ndl=3'  
        print(f'正在爬取第{i}页的搜索页数据')
        searchData = process_spider( # 返回搜索页数据列表，元数据为字典
            args={
                'id': None,
                'url': target,
                'title': None,
                'method': 'spider_search_page'
            },
            platform=current_platform
        )
        print(f'正在爬取第{i}页的详情页数据')
        for item in searchData:
            detailData = process_spider(
                args={
                    'id': None,
                    'url': item['detail_link'],
                    'title': item['title'],
                    'method': 'spider_detail_page'
                },
                platform=current_platform
            )
            if not detailData: # 详情页爬取失败，跳过
                continue
            item.update(detailData) # 合并数据
            print(item['title']+'爬取完成')
            saveAsCSV(item)
            gameNum += 1
            print(f'当前爬取游戏数量:{gameNum},位于第{i}页')

            
    print('爬取完成')
    print(f'共爬取{gameNum}个游戏')
    timeUsed = time.time()-st_time
    print(f'总计消耗时间 {timeUsed} s')


