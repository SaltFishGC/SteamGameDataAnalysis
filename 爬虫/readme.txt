爬虫原脚本来源：https://github.com/Xayanium/Steam-Data-Analysis/tree/master
原项目使用了linux搭建环境一套完成，本次课设先将所需数据摘取下来，再导入hadoop的hive完成数据分析
爬虫启动说明：
    单线程爬取：(getCSV)
        完成py所需所有的包安装后，启动好chrome浏览器（需要事先安装），浏览器需要指定对应端口号，cmd命令：
        "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="D:\Program\Selenium\Profile"
        随后就可以直接运行py文件了（ide，cmd均可）
    优化版多线程爬取：(getCSV_multiThread_ver2)
        基础的启动等操作已自动化，只要保证驱动已安装且位置正确即可
        chromedriver_path = r"C:\Program Files\Google\Chrome\Application\chromedriver.exe"
        详见81行，安装驱动时注意版本对应

        需要修改的参数：（451行）
        start_page = 250 # 起始页
        page_interval = 200 # 每个线程爬取的页数
        num_threads = 5 # 线程数

        详细内容见py文件