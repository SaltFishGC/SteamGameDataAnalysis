import os

# def fetch_url(url, retries=3, delay=1):
#     for attempt in range(retries):
#         try:
#             response = requests.get(url)
#             response.raise_for_status()  # 检查是否成功
#             return response.text
#         except requests.RequestException as e:
#             print(f"Attempt {attempt + 1} failed: {e}")
#             sleep(delay)  # 等待一段时间后重试
#     return None

# # 示例调用
# url = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1"
# content = fetch_url(url)
# if content:
#     print("Content fetched successfully!")
# else:
#     print("Failed to fetch content.")

# if os.path.exists('../data/game.csv'):  # 清理之前的csv缓存文件
#     os.remove('../data/game.csv')

import csv
import re

import pandas as pd

# 输入文件名和输出文件名
input_file = '../data/game.csv'
output_file = '../data/games_with_review_stats.csv'
if(os.path.exists(output_file)):
    os.remove(output_file)

# 定义一个函数来转换日期格式
def convert_date(date_str):
    match = re.search(r'(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日', date_str)
    if match:
        year, month, day = match.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"  # 格式化为 YYYY-MM-DD
    return date_str  # 如果格式不匹配，返回原字符串

# 定义一个函数来解析review_summary字段并提取好评率和评论数
def extract_review_stats(review_summary):
    # 使用正则表达式匹配好评率和评论数
    match = re.search(r'(\d+)%', review_summary)
    if match:
        good_rate = int(match.group(1))
    else:
        good_rate = None

    match = re.search(r'(\d[\d,]*) 篇用户评测', review_summary)
    if match:
        review_count = int(match.group(1).replace(',', ''))  # 去掉千位分隔符
    else:
        review_count = None

     # 提取综合评价
    overall_evaluation_match = re.search(r'^([\u4e00-\u9fa5]+)', review_summary)
    if overall_evaluation_match:
        overall_evaluation = overall_evaluation_match.group(1)
    else:
        overall_evaluation = None

    return good_rate, review_count, overall_evaluation

def quChong():
    # 读取 CSV 文件
    data = pd.read_csv(output_file, encoding='utf-8-sig')

    # 去除重复行
    # 默认情况下，drop_duplicates() 会检查所有列来判断重复
    # 如果只想根据某些列去重，可以指定 subset 参数，例如 subset=['title', 'release_date']
    data_unique = data.drop_duplicates()
    
    # 将去重后的数据保存到新的 CSV 文件
    output_file_path = r'..\data\game_quchong.csv'  # 替换为输出文件路径
    if(os.path.exists(output_file_path)):
        os.remove(output_file_path)
    data_unique.to_csv(output_file_path, index=False, encoding='utf-8-sig')

    print(f"\n去重后的数据已保存到 {output_file_path}")
    


# 打开输入文件和输出文件
with open(input_file, mode='r', encoding='utf-8') as infile, \
     open(output_file, mode='w', encoding='utf-8', newline='') as outfile:
    
    # 创建CSV读取器和写入器
    reader = csv.DictReader(infile)
    fieldnames = ['id',] + reader.fieldnames + ['good_rate', 'review_count','overall_evaluation']  # 添加新字段
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    
    # 写入表头
    writer.writeheader()
    id = 1
    # 遍历输入文件的每一行
    for row in reader:
        review_summary = row['review_summary']
        good_rate, review_count, overall_evaluation = extract_review_stats(review_summary)
        
        # 将新字段添加到行中
        row['id'] = id
        row['good_rate'] = good_rate
        row['review_count'] = review_count
        row['overall_evaluation'] = overall_evaluation
        
        row['release_date'] = convert_date(row['release_date'])
        
        # 写入输出文件
        writer.writerow(row)
        id += 1

quChong()