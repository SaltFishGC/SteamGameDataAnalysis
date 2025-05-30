大数据课设：steam游戏数据分析
爬虫原版py来源：https://github.com/Xayanium/Steam-Data-Analysis/tree/master
大致结构：爬虫提取csv，csv转储到hive，hive进行查询sqoop转储到mysql，最终用java的单体项目展示结果
前置的hadoop以及hive安装需要先完成才能进行操作请注意！
提供的游戏数据具有时效性请注意！ time：2025.5
大量ip以及url需要修改为自己的配置才能使用请注意！

本项目由于bro的笔记本太辣鸡，虚拟机最多8个G内存，导致vmware频繁卡住io装私，故并非单体项目，提取结果后拆开展示了。
整体被拆为虚拟机外py爬虫获取原始数据csv --> csv文件导入linux虚拟机hivesql查询分析 --> hivesql查询结果结合sqoop导出至mysql --> springboot单体项目链接mysql结合echarts将结果可视化。（真不是bro不愿意研究jdbc）
如需原始数据爬取，请使用爬虫文件夹，data内含2025.5的数据，py内含多线程爬虫py代码以及数据清洗py代码，请使用ver2（具体说明已在其中的readme给出）
如需hivesql复现，请参照“hivesql以及sqoop转储详细记录”文件，记录比较潦草，不推荐使用，看看就行，拿到最后的mysql数据就好。如需复现，则需要一定的准备，包括hadoop的安装等。
如果不需要复现数据爬取以及hivesql的过程，那么只需要执行mysqldata下的sql文件即可获取数据到你的mysql库中，再到springboot项目中修改database设置即可。
springboot：3.1.2 
jdk：17
