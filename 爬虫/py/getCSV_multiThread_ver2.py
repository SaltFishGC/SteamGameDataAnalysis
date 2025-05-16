import gc
import os.path
import re
import sys
import time
import csv
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common import TimeoutException

import threading
import queue
import concurrent.futures
import subprocess

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)

'''
原版github地址：https://github.com/Xayanium/Steam-Data-Analysis
在原本的项目代码中，爬虫逻辑直接将csv爬取出并保存到mysql数据库中
此次课设使用hive直接存储分析，对爬虫py做修改，将mysql部分去除，只保留爬虫逻辑，将数据保存到csv文件
代码大致逻辑：
    1. 爬取搜索页面信息：爬取steam首页的搜索结果页面，获取搜索页面就可以得到的数据以及对应的详情页url组成gamelist
    2. 爬取详情页面信息：对gamelist的每个数据的详情页url遍历，通过url来爬取详情数据
    3. 数据保存：将爬取到的数据保存到csv文件。

代码实现：
    在原本的Spider类中封装了多个函数，主要实现了chrome的渲染启动，页面滚动，数据爬取，将数据以类元素的方式存储（但实际并没有用到）
    爬虫启动接口process_spider通过参数初始化一个Spider对象，并调用spider_search_page或者spider_detail_page函数，传入参数，进行爬取。
函数逻辑：
    1. 爬取搜索页数据：爬取一个搜索页的数据，返回一个list字典，每个字典代表一个游戏，返回一个字典list
    2. 爬取详情页数据：爬取一个详情页的数据，返回一个字典，每个字典代表一个游戏，返回一个字典
    最终将list中的数据挨个拼接，得到将爬取到的数据保存到csv文件，对所需的页数作遍历即可完成爬虫操作
    爬取时可能会出现页面加载超时的问题，如果加速器/vpn就绪的话，只是当前商品是dlc/音乐包/捆绑包导致没有相应数据而已，这些商品的数据本身没有那么重要，可以忽略不计
    （也有可能是年龄限制的提示覆盖了div块使得数据没有加载，无法被读取，但是出现的概率比较玄学，我纯蓝狗一条不做了）
    有时候还会卡住线程，一般是由于资源占用的问题导致几个线程卡住，并不会导致完全卡死，在其他线程的资源释放之后就会继续，安心挂机即可

author: SaltFishGC
后续更新ver.1：
    由于单个线程爬取数据比较慢，这里使用了多线程爬取数据put到queue+单线程使用queue写入csv文件的结构完成爬取，思路：
    多线程共用一个csv文件同时写入可能会造成锁或者文件损毁的问题，所以要用queue写入csv文件，每次写入前先判断queue是否为空，为空则写入，不为空则等待，直到获取到None结束循环
    同样多线程无法共用一个chromeDriver，需要多个实例启动，虽然原本的代码中每次爬虫执行本来就要生成一个实例，但多线程下每个实例又需要自己的端口，
    同时不能启动太多实例，实际测试5~8个线程比较稳妥，爬太快容易被ban（用wifi的话重连就可以了，steam的反爬虫没那么严）
    顺带每次爬取容易搞到相同的数据，这里用pandas搞了一个去重程序，并搞了一下数据处理，方便提取数据分析

后续更新ver.2：
    大量运行时观察到出现了创建大量driver而不会自行销毁的问题，这时会导致不必要的资源浪费，
    甚至由于大量driver监听同一端口争夺使用权导致线程锁死的情况出现，后续考虑显式释放driver，但是这样切换页面时会发生明显卡顿影响爬取速率
    现在在每一个线程中使用了同一个driver实例避免此种问题
    最后需要注意网速问题，加载速度若过慢超过3s可能导致数据丢失
    
'''

class Spider(object):
    # 其实就是对driver的封装，加上了url等信息，后续由于过于耦合，已经改的面目全非了，事实上没有必要做这个对象，几个方法改为静态的也完全没问题
    def __init__(self, id, spider_url, title, chromeDriverIp, driver=None):
        self.spider_url = spider_url
        self.id = id
        self.root_path = Path(__file__).parent.parent.resolve()
        # self.conf_path = os.path.join(self.root_path, 'config.json')
        self.driver = driver # 使用传入的driver，避免不停的创建driver
        if self.driver is None: # 如果没有传入driver，则创建一个新的driver
            self.driver = self.start_browser(chromeDriverIp=chromeDriverIp)
        # self.type_list = None
        # self.description = None
        # self.description = None
        # self.developer = None
        # self.publisher = None
        # self.image_links = None
        # self.video_link = None
        # self.spider_result_list = None
        self.title = title
        
    # def close(self):
    #     if self.driver:
    #         self.driver.quit()  # 显式关闭所有窗口并退出浏览器驱动程序 比较耗时

    # def __del__(self):
    #     self.close()  # 确保在对象销毁时调用 close 方法
    def start_browser(self, chromeDriverIp = '127.0.0.1:9222'):
        option = webdriver.ChromeOptions()
        option.add_experimental_option('debuggerAddress', chromeDriverIp)
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
        try:
            # 使用显式等待确保页面加载完成
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'search_result_row')]"))
            )
        except TimeoutException:
            print("页面加载超时，未找到元素")
            return {}
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
            print(f'搜索页 {title} 数据爬取成功')
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
            WebDriverWait(self.driver, 3).until(
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

# 爬虫启动入口函数，生成一个Spider对象，并调用对应的方法进行爬取
def process_spider(args: dict, platform, driver=None):
    try:
        spider = Spider(args['id'], args['url'], args['title'],args['chromeDriverIp'],driver=driver)
        if args['method'] == 'spider_search_page':
            return spider.spider_search_page()
        elif args['method'] == 'spider_detail_page':
            return spider.spider_detail_page()
        print('finish one spider task')
    except Exception as e:
        print('spider pages error: ', e)
    # finally:
    #     if spider:
    #         spider.close()  # 显式释放资源

# 使用多线程直接open一个文件会造成锁甚至损毁或者失败，这里使用一个单独的写入线程，其使用安全队列获取其他线程输入的数据来写入csv文件
def saveAsCSV():
    while True:
        item = data_queue.get()  # 从队列中获取数据
        if item is None:  # 如果队列中放入了 None，表示写入完成
            print("写入完成")
            break
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
                item.get('release_date'),
                item.get('review_summary'),
                item.get('discount'),
                item.get('original_price'),
                item.get('final_price'),
                ','.join(item.get('type_list', [])),
                item.get('developer'),
                item.get('publisher')
            ])
        data_queue.task_done()

gameNum = 0 # 爬取游戏数量
current_platform = sys.platform  # 检测当前运行的平台

#  批量爬虫函数
#  参数：起始页，结束页，驱动ip
def startSpider(startPage,endPage,chromeDriverIp):
    global gameNum
    
    option = webdriver.ChromeOptions()
    option.add_experimental_option('debuggerAddress', chromeDriverIp)
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
    # option.add_argument("--disable-javascript")  # 禁用 JavaScript，减少动态内容加载
    
    # 直接指定本地 ChromeDriver 路径
    # ChromeDriver安装教程：https://blog.csdn.net/weixin_45109684/article/details/117650036
    chromedriver_path = r"C:\Program Files\Google\Chrome\Application\chromedriver.exe"
    service = Service(chromedriver_path)
    driver = webdriver.Chrome(service=service, options=option)
    driver.implicitly_wait(1.5)  # 设置隐式等待3秒
    # driver.get(self.spider_url)
    
    try:
        for i in range(startPage,endPage+1):
            # print('-------------')
            # print(f'正在爬取第{i}页')
            # print('-------------')
            target = f'https://store.steampowered.com/search/?page={i}&ndl=3'  
            driver.get(target)
            # print(f'正在爬取第{i}页的搜索页数据')
            searchData = process_spider( # 返回搜索页数据列表，元数据为字典
                args={
                    'id': None,
                    'url': target,
                    'title': None,
                    'method': 'spider_search_page',
                    'chromeDriverIp': chromeDriverIp
                },
                platform=current_platform,
                driver=driver
            )
            # print(f'正在爬取第{i}页的详情页数据')
            for item in searchData:
                driver.get(item['detail_link'])
                detailData = process_spider(
                    args={
                        'id': None,
                        'url': item['detail_link'],
                        'title': item['title'],
                        'method': 'spider_detail_page',
                        'chromeDriverIp': chromeDriverIp
                    },
                    platform=current_platform,
                    driver=driver
                )
                if not detailData: # 详情页爬取失败，跳过
                    continue
                item.update(detailData) # 合并数据
                print(item['title']+f'爬取完成,位于第{i}页')
                data_queue.put(item)
                gameNum += 1
                if(gameNum % 10 == 0):
                    print('--------------------')
                    print(f'当前爬取游戏数量:{gameNum}')
                    print('--------------------')
                
    except Exception as e:
        raise f'出现错误：{e}'
    print('----------------------------')
    print(f'任务{startPage}至{endPage}已完成')
    print('----------------------------')
    driver.quit()
    gc.collect()
    
    return '成功'
    
data_queue = queue.Queue()  # 线程安全的队列
chrome_processes = [] # 存储启动的 Chrome 进程
# 启动多个 Chrome 实例
def start_chrome_instances(num_threads):
    # 定义 Chrome 的可执行路径
    chrome_path = r'"C:\Program Files\Google\Chrome\Application\chrome.exe"'
    # 定义用户数据目录的路径
    user_data_dir = r"D:\Program\Selenium\Profile"
    # 定义起始端口号
    start_port = 41960

    # 启动多个 Chrome 实例
    for i in range(num_threads):
        # 计算当前实例的端口号
        port = start_port + i
        # 构造启动命令
        chrome_command = f'{chrome_path} --remote-debugging-port={port} --user-data-dir="{user_data_dir}_{i}"'
        # 启动 Chrome 实例
        chrome_process = subprocess.Popen(chrome_command, shell=True)
        chrome_processes.append(chrome_process)
        print(f"启动 Chrome 实例 {i + 1}/{num_threads}，端口为 {port}")

    

if __name__ == '__main__':
    # clean：0-不清理，1-清理
    st_time = time.time()
    clean = 0 # 是否清理缓存文件 
    if(clean == 1):
        if os.path.exists('../data/game.csv'):  # 清理之前的csv缓存文件
            os.remove('../data/game.csv')
    
    # 启动 CSV 写入线程
    csv_writer_thread = threading.Thread(target=saveAsCSV, daemon=True)
    csv_writer_thread.start()

    # 多线程爬取
    # start_page = 4000 # 起始页
    # page_interval = 20 # 每个线程爬取的页数
    # num_threads = 5 # 线程数
    start_page = 6600 # 起始页
    page_interval = 80 # 每个线程爬取的页数（相间隔的页数）
    num_threads = 5 # 线程数
    
    start_chrome_instances(num_threads) # 启动 Chrome 实例
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        # concurrent.futures.ThreadPoolExecutor: 这是一个线程池管理器，用于创建和管理多个线程。
        # max_workers=num_threads 指定了线程池中最大线程数，num_threads 是你定义的变量，表示需要启动的线程数量。
        futures = []
        future_names = []
        # 定义了一个空列表 futures，用于存储线程池返回的 Future 对象。
        # Future 对象表示异步执行的操作，每个 Future 对象对应一个线程的任务。
        for i in range(num_threads):
            start_page_i = start_page + i * page_interval # 计算每个线程的起始页面编号
            end_page_i = start_page_i + page_interval - 1# 计算每个线程的结束页面编号
            chromeDriverIp = f'127.0.0.1:{41960 + i}' # 计算每个线程的 ChromeDriver 端口号
            futures.append(executor.submit(startSpider, start_page_i, end_page_i, chromeDriverIp))
            future_names.append(f"任务{start_page_i}至{end_page_i}")
            # 使用 executor.submit 方法将任务提交到线程池中。
            # startSpider 是要执行的函数，start_page_i、end_page_i 和 chromeDriverIp 是传递给 startSpider 函数的参数。
            # executor.submit 返回一个 Future 对象，表示任务的执行状态。
            # 将返回的 Future 对象添加到 futures 列表中，以便后续跟踪任务的完成情况。
            
        # 每60秒检测一次线程状态
        while True:
            time.sleep(60)  # 每60秒检测一次
            completed = 0
            print('------------------------')
            print("当前任务状态:")
            for future, name in zip(futures, future_names):
                if future.done():
                    completed += 1
                    print(f"线程 {name} 已完成")
                else:
                    print(f"线程 {name} 仍在运行...")
            print(f"已完成的线程数: {completed}/{len(futures)}")
            print('------------------------')
            if completed == len(futures):
                print("所有线程已完成，退出检测循环。")
                break

    # 等待所有线程完成
    for future, name in zip(futures, future_names):
        try:
            result = future.result()  # 获取任务的返回值
            print(f"{name} 的返回结果: {result}")
        except Exception as e:
            print(f"{name} 出现异常: {e}")

    # 停止 CSV 写入线程
    data_queue.put(None)
    csv_writer_thread.join()
    
    # 停止 Chrome 进程
    for process in chrome_processes:
        process.terminate()
    
    print('爬取完成')
    print(f'共爬取{gameNum}个游戏')
    timeUsed = time.time()-st_time
    print(f'总计消耗时间 {timeUsed} s')


