// 初始化图表
let chart = null;
let yearlyCharts = []; // 存储年度热门游戏图表实例

// 安全销毁图表函数
function safeDisposeChart(chartInstance) {
    if (!chartInstance) return;
    try {
        if (!chartInstance.isDisposed()) {
            chartInstance = null;
        }
    } catch (error) {
        console.error('销毁图表时出错:', error);
    }
}

// 重新创建主图表容器
function recreateMainChartContainer() {
    const mainChart = document.getElementById('main-chart');
    if (!mainChart) return null;
    
    // 创建新的容器
    const newContainer = document.createElement('div');
    newContainer.id = 'main-chart';
    newContainer.className = 'main-chart';
    
    // 替换旧容器
    mainChart.parentNode.replaceChild(newContainer, mainChart);
    
    return newContainer;
}

// 初始化图表函数
function initChart() {
    const chartDom = recreateMainChartContainer();
    if (!chartDom) {
        console.error('找不到主图表容器');
        return;
    }
    
    // 安全销毁旧图表
    safeDisposeChart(chart);
    
    // 创建新图表
    try {
        chart = echarts.init(chartDom);
    } catch (error) {
        console.error('初始化图表失败:', error);
    }
}

// 清除所有年度热门游戏图表
function clearYearlyCharts() {
    // 清除图表实例
    yearlyCharts.forEach(chart => {
        safeDisposeChart(chart);
    });
    yearlyCharts = [];
    
    // 清除图表容器
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        // 移除所有年度图表容器
        const yearlyCharts = chartContainer.querySelectorAll('.yearly-chart');
        yearlyCharts.forEach(chart => {
            if (chart.parentNode) {
                chart.parentNode.removeChild(chart);
            }
        });
        
        // 移除年度图表容器
        const yearlyChartsContainer = chartContainer.querySelector('.yearly-charts');
        if (yearlyChartsContainer) {
            yearlyChartsContainer.remove();
        }
    }
}

// 页面加载完成后初始化图表
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    // 默认加载年份发布统计
    fetchData('publish-year-stats');
});

// 导航点击事件
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 更新活动状态
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        // 获取数据并更新图表
        const section = this.dataset.section;
        fetchData(section);
    });
});

// 获取数据并更新图表
async function fetchData(section) {
    try {
        const response = await fetch(`/api/data/${section}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateChart(section, data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// 处理年份发布统计数据
function processPublishYearData(data) {
    // 过滤并处理数据
    const processedData = data
        .filter(item => {
            // 保留数字年份且范围在1990-2030之间的数据
            const year = parseInt(item.publishYear);
            return !isNaN(year) && year >= 1990 && year <= 2030;
        })
        .sort((a, b) => parseInt(a.publishYear) - parseInt(b.publishYear));

    // 获取特殊类别数据
    const specialCategories = data.filter(item => 
        item.publishYear === "即将推出" || item.publishYear === "即将宣布"
    );

    // 计算其他类别的总数（排除特殊类别）
    const otherCategories = data.filter(item => {
        const year = parseInt(item.publishYear);
        return (isNaN(year) || year < 1990 || year > 2030) && 
               item.publishYear !== "即将推出" && 
               item.publishYear !== "即将宣布";
    });

    const otherTotal = otherCategories.reduce((sum, item) => sum + item.gameCount, 0);

    // 添加特殊类别
    processedData.push(...specialCategories);

    // 添加"其他"类别（如果存在）
    if (otherTotal > 0) {
        processedData.push({
            publishYear: "其他",
            gameCount: otherTotal
        });
    }

    return processedData;
}

// 处理年度热门游戏数据
function processYearlyTopGamesData(data) {
    // 按年份分组
    const gamesByYear = {};
    data.forEach(game => {
        if (!gamesByYear[game.publishYear]) {
            gamesByYear[game.publishYear] = [];
        }
        gamesByYear[game.publishYear].push(game);
    });

    // 对每年的游戏按评论数排序并只保留前5名
    Object.keys(gamesByYear).forEach(year => {
        gamesByYear[year].sort((a, b) => b.reviewCount - a.reviewCount);
        gamesByYear[year] = gamesByYear[year].slice(0, 5);
    });

    // 获取所有年份并按降序排序
    const years = Object.keys(gamesByYear).sort((a, b) => parseInt(b) - parseInt(a));

    return {
        years,
        gamesByYear
    };
}

// 创建年度热门游戏图表
function createYearlyTopGamesChart(year, games) {
    // 确保容器存在
    let yearlyChartsContainer = document.querySelector('.yearly-charts');
    if (!yearlyChartsContainer) {
        yearlyChartsContainer = document.createElement('div');
        yearlyChartsContainer.className = 'yearly-charts';
        document.getElementById('chart-container').appendChild(yearlyChartsContainer);
    }
    
    const chartDom = document.createElement('div');
    chartDom.className = 'yearly-chart';
    chartDom.style.width = '100%';
    chartDom.style.height = '300px';
    chartDom.style.marginBottom = '30px';
    
    yearlyChartsContainer.appendChild(chartDom);
    
    let chart = null;
    try {
        chart = echarts.init(chartDom);
    } catch (error) {
        console.error('创建图表失败:', error);
        if (chartDom.parentNode) {
            chartDom.parentNode.removeChild(chartDom);
        }
        return null;
    }
    
    const option = {
        title: {
            text: `${year}年热门游戏评论数统计`,
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const data = params[0];
                return `${data.name}<br/>评论数：${Math.round(data.value).toLocaleString()}条`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: games.map(game => game.title),
            axisLabel: {
                interval: 0,
                rotate: 45,
                formatter: function(value) {
                    if (value.length > 15) {
                        return value.substring(0, 15) + '...';
                    }
                    return value;
                }
            }
        },
        yAxis: {
            type: 'value',
            name: '评论数',
            nameLocation: 'middle',
            nameGap: 40,
            axisLabel: {
                formatter: function(value) {
                    if (value >= 1000000) {
                        return (value / 1000000).toFixed(1) + 'M';
                    } else if (value >= 1000) {
                        return (value / 1000).toFixed(1) + 'K';
                    }
                    return value;
                }
            }
        },
        series: [{
            name: '评论数',
            type: 'bar',
            data: games.map(game => ({
                value: game.reviewCount,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 0.5, color: '#188df0' },
                        { offset: 1, color: '#188df0' }
                    ])
                }
            })),
            emphasis: {
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#2378f7' },
                        { offset: 0.7, color: '#2378f7' },
                        { offset: 1, color: '#83bff6' }
                    ])
                }
            }
        }]
    };
    
    try {
        chart.setOption(option);
    } catch (error) {
        console.error('设置图表配置失败:', error);
        if (chart && !chart.isDisposed()) {
            const dom = chart.getDom();
            if (dom && dom.parentNode) {
                chart.dispose();
            }
        }
        if (chartDom.parentNode) {
            chartDom.parentNode.removeChild(chartDom);
        }
        return null;
    }
    
    return chart;
}

// 处理近一年游戏数据
function processRecentGamesData(data) {
    // 按评价等级分组
    const evaluationGroups = {
        '好评如潮': [],
        '特别好评': [],
        '多半好评': [],
        '褒贬不一': [],
        '多半差评': [],
        '差评如潮': []
    };

    // 对游戏进行分组
    data.forEach(game => {
        if (evaluationGroups[game.overallEvaluation]) {
            evaluationGroups[game.overallEvaluation].push(game);
        }
    });

    // 计算每个评价等级的游戏数量和平均好评率
    const evaluationStats = Object.entries(evaluationGroups).map(([evaluation, games]) => ({
        evaluation,
        count: games.length,
        avgGoodRate: games.reduce((sum, game) => sum + parseFloat(game.goodRate), 0) / games.length,
        games: games.sort((a, b) => b.reviewCountNum - a.reviewCountNum).slice(0, 5) // 每个等级取评论数最多的5个游戏
    }));

    return evaluationStats;
}

// 处理游戏类型数据
function processGameTypeData(data) {
    // 确保数据是数组
    if (!Array.isArray(data)) {
        console.error('游戏类型数据不是数组格式');
        return null;
    }

    // 按不同维度排序并获取前30名
    const topByGoodRate = [...data]
        .sort((a, b) => b.avgGoodRate - a.avgGoodRate)
        .slice(0, 30);
    
    const bottomByGoodRate = [...data]
        .sort((a, b) => a.avgGoodRate - b.avgGoodRate)
        .slice(0, 30);
    
    const topByReviewCount = [...data]
        .sort((a, b) => b.totalReviewCount - a.totalReviewCount)
        .slice(0, 30);
    
    const topByGameCount = [...data]
        .sort((a, b) => b.gameCount - a.gameCount)
        .slice(0, 30);

    // 计算其他类别的总和
    const calculateOthers = (top30, data, valueKey) => {
        const top30Types = new Set(top30.map(item => item.type));
        const othersValue = data
            .filter(item => !top30Types.has(item.type))
            .reduce((sum, item) => sum + item[valueKey], 0);
        return othersValue;
    };

    return {
        topByGoodRate: {
            data: topByGoodRate,
            others: calculateOthers(topByGoodRate, data, 'avgGoodRate')
        },
        bottomByGoodRate: {
            data: bottomByGoodRate,
            others: calculateOthers(bottomByGoodRate, data, 'avgGoodRate')
        },
        topByReviewCount: {
            data: topByReviewCount,
            others: calculateOthers(topByReviewCount, data, 'totalReviewCount')
        },
        topByGameCount: {
            data: topByGameCount,
            others: calculateOthers(topByGameCount, data, 'gameCount')
        }
    };
}

// 创建游戏类型分析图表
function createGameTypeChart(containerId, title, data, valueKey, formatter) {
    try {
        if (!data || !data.data || !Array.isArray(data.data)) {
            console.error('无效的游戏类型数据');
            return null;
        }

        // 创建图表容器
        const containerDiv = document.createElement('div');
        containerDiv.className = 'game-type-chart-container';
        
        const chartDom = document.createElement('div');
        chartDom.className = 'game-type-chart';
        
        containerDiv.appendChild(chartDom);
        
        const container = document.getElementById('game-type-charts');
        if (!container) {
            console.error('找不到游戏类型图表容器');
            return null;
        }
        
        container.appendChild(containerDiv);
        
        let chart = null;
        try {
            chart = echarts.init(chartDom);
        } catch (error) {
            console.error('创建图表失败:', error);
            if (containerDiv.parentNode) {
                container.removeChild(containerDiv);
            }
            return null;
        }

        // 计算总值和百分比
        const totalValue = data.data.reduce((sum, item) => sum + item[valueKey], 0) + data.others;
        const othersPercentage = (data.others / totalValue * 100).toFixed(1);
        
        const option = {
            title: {
                text: title,
                left: 'center',
                top: 20,
                textStyle: {
                    fontSize: 16
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    if (params.seriesType === 'pie') {
                        if (params.name === '其他') {
                            return `其他类型<br/>${formatter(params.value)}<br/>占比：${othersPercentage}%`;
                        }
                        const item = data.data.find(d => d.type === params.name);
                        if (!item) return params.name;
                        const percentage = (item[valueKey] / totalValue * 100).toFixed(1);
                        return `${params.name}<br/>` +
                               `游戏数量：${item.gameCount}款<br/>` +
                               `好评率：${item.avgGoodRate.toFixed(1)}%<br/>` +
                               `评论数：${Math.round(item.totalReviewCount).toLocaleString()}条<br/>` +
                               `${formatter(item[valueKey])}<br/>` +
                               `占比：${percentage}%`;
                    }
                    return params.name;
                }
            },
            legend: {
                orient: 'vertical',
                left: '5%',
                top: 'middle',
                type: 'scroll',
                textStyle: {
                    fontSize: 12
                }
            },
            series: [
                {
                    name: '游戏类型分布',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}\n{d}%',
                        fontSize: 12
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 14,
                            fontWeight: 'bold'
                        }
                    },
                    data: data.data.map(item => ({
                        name: item.type,
                        value: item[valueKey]
                    }))
                },
                {
                    name: '其他',
                    type: 'pie',
                    radius: ['0%', '0%'],
                    center: ['90%', '20%'],
                    label: {
                        show: true,
                        position: 'center',
                        formatter: `其他\n${othersPercentage}%`,
                        fontSize: 14,
                        fontWeight: 'bold'
                    },
                    data: [{
                        name: '其他',
                        value: data.others,
                        itemStyle: {
                            color: '#95a5a6'
                        }
                    }]
                }
            ]
        };
        
        try {
            chart.setOption(option);
        } catch (error) {
            console.error('设置图表配置失败:', error);
            safeDisposeChart(chart);
            if (containerDiv.parentNode) {
                container.removeChild(containerDiv);
            }
            return null;
        }
        
        return chart;
    } catch (error) {
        console.error('创建游戏类型图表时出错:', error);
        return null;
    }
}

// 处理价格与好评率数据
function processPriceGoodrateData(data) {
    // 按价格范围排序
    const priceOrder = ['Free', '0 - 10', '10 - 20', '20 - 30', '30 - 40', '40 - 50', '50 - 100', '100 - 200', '200 - 400', '400 - 800', '800+'];
    
    return data.sort((a, b) => {
        return priceOrder.indexOf(a.priceRange) - priceOrder.indexOf(b.priceRange);
    });
}

// 处理销售额数据
function processSalesData(data) {
    // 按销售额排序
    const sortedData = [...data].sort((a, b) => b.sales - a.sales);
    
    // 获取前40名
    const top40 = sortedData.slice(0, 40);
    
    // 计算其他游戏的总销售额
    const othersSales = sortedData.slice(40).reduce((sum, item) => sum + item.sales, 0);
    
    return {
        top40,
        othersSales,
        totalSales: sortedData.reduce((sum, item) => sum + item.sales, 0)
    };
}

// 处理开发商好评率数据
function processDeveloperGoodrateData(data) {
    // 按好评数排序
    const sortedData = [...data].sort((a, b) => b.totalGoodReviews - a.totalGoodReviews);
    
    // 获取前40名
    const top40 = sortedData.slice(0, 40);
    
    // 计算其他开发商的总好评数
    const othersGoodReviews = sortedData.slice(40).reduce((sum, item) => sum + item.totalGoodReviews, 0);
    
    return {
        top40,
        othersGoodReviews,
        totalGoodReviews: sortedData.reduce((sum, item) => sum + item.totalGoodReviews, 0)
    };
}

// 处理开发商销售额数据
function processDeveloperSalesData(data) {
    // 按销售额排序
    const sortedData = [...data].sort((a, b) => b.totalSales - a.totalSales);
    
    // 获取前40名
    const top40 = sortedData.slice(0, 40);
    
    // 计算其他开发商的总销售额
    const othersSales = sortedData.slice(40).reduce((sum, item) => sum + item.totalSales, 0);
    
    return {
        top40,
        othersSales,
        totalSales: sortedData.reduce((sum, item) => sum + item.totalSales, 0)
    };
}

// 处理价格区间分布数据
function processPriceDistributionData(data) {
    // 定义价格区间的顺序
    const priceOrder = [
        'Free',
        '0 - 10',
        '10 - 20',
        '20 - 30',
        '30 - 40',
        '40 - 50',
        '50 - 100',
        '100 - 200',
        '200 - 400',
        '400 - 800',
        '800+'
    ];
    
    // 按价格区间顺序排序
    return data.sort((a, b) => {
        return priceOrder.indexOf(a.priceRange) - priceOrder.indexOf(b.priceRange);
    });
}

// 更新图表
function updateChart(section, data) {
    try {
        let option = {};
        let processedData;
        
        // 清除所有年度热门游戏图表
        clearYearlyCharts();
        
        // 获取图表容器
        const mainChart = document.getElementById('main-chart');
        const gameTypeCharts = document.getElementById('game-type-charts');
        
        if (!mainChart || !gameTypeCharts) {
            console.error('找不到必要的图表容器');
            return;
        }
        
        // 重新创建主图表容器
        const newMainChart = recreateMainChartContainer();
        if (!newMainChart) {
            console.error('重新创建主图表容器失败');
            return;
        }
        
        // 清空游戏类型图表容器
        gameTypeCharts.innerHTML = '';
        
        // 显示主图表容器
        newMainChart.style.display = 'block';
        gameTypeCharts.style.display = 'none';
        
        // 安全销毁并重新初始化主图表
        safeDisposeChart(chart);
        try {
            chart = echarts.init(newMainChart);
        } catch (error) {
            console.error('初始化主图表失败:', error);
            return;
        }
        
        switch(section) {
            case 'yearly-top-games':
                processedData = processYearlyTopGamesData(data);
                if (!processedData) {
                    console.error('处理年度热门游戏数据失败');
                    return;
                }
                
                // 隐藏主图表
                newMainChart.style.display = 'none';
                
                // 为每年的游戏创建图表
                processedData.years.forEach(year => {
                    const games = processedData.gamesByYear[year];
                    const chart = createYearlyTopGamesChart(year, games);
                    if (chart) {
                        yearlyCharts.push(chart);
                    }
                });
                
                // 监听窗口大小变化
                const resizeHandler = () => {
                    yearlyCharts.forEach(chart => {
                        try {
                            if (chart && !chart.isDisposed()) {
                                chart.resize();
                            }
                        } catch (error) {
                            console.error('调整图表大小时出错:', error);
                        }
                    });
                };
                
                window.addEventListener('resize', resizeHandler);
                return;
                
            case 'game-type-analysis':
                processedData = processGameTypeData(data);
                if (!processedData) {
                    console.error('处理游戏类型数据失败');
                    return;
                }
                
                // 隐藏主图表，显示游戏类型图表
                newMainChart.style.display = 'none';
                gameTypeCharts.style.display = 'block';
                
                // 创建四个图表
                const containers = [
                    { id: 'top-goodrate', title: '好评率最高的游戏类型', data: processedData.topByGoodRate, valueKey: 'avgGoodRate', formatter: v => `平均好评率：${v.toFixed(1)}%` },
                    { id: 'bottom-goodrate', title: '好评率最低的游戏类型', data: processedData.bottomByGoodRate, valueKey: 'avgGoodRate', formatter: v => `平均好评率：${v.toFixed(1)}%` },
                    { id: 'top-reviewcount', title: '评论数最多的游戏类型', data: processedData.topByReviewCount, valueKey: 'totalReviewCount', formatter: v => `评论数：${Math.round(v).toLocaleString()}条` },
                    { id: 'top-gamecount', title: '游戏数量最多的类型', data: processedData.topByGameCount, valueKey: 'gameCount', formatter: v => `游戏数量：${v}款` }
                ];
                
                // 为每个维度创建图表
                containers.forEach(container => {
                    try {
                        const chart = createGameTypeChart(
                            container.id,
                            container.title,
                            container.data,
                            container.valueKey,
                            container.formatter
                        );
                        
                        if (chart) {
                            yearlyCharts.push(chart);
                        }
                    } catch (error) {
                        console.error('创建游戏类型图表失败:', error);
                    }
                });
                
                // 监听窗口大小变化
                const resizeHandler2 = () => {
                    yearlyCharts.forEach(chart => {
                        try {
                            if (chart && !chart.isDisposed()) {
                                chart.resize();
                            }
                        } catch (error) {
                            console.error('调整图表大小时出错:', error);
                        }
                    });
                };
                
                window.addEventListener('resize', resizeHandler2);
                return;
                
            case 'publish-year-stats':
                processedData = processPublishYearData(data);
                option = {
                    title: { 
                        text: '年份发布统计',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        formatter: function(params) {
                            const data = params[0];
                            if (data.name === '其他') {
                                return `其他类别<br/>游戏数量：${data.value}款`;
                            }
                            if (data.name === '即将推出' || data.name === '即将宣布') {
                                return `${data.name}<br/>游戏数量：${data.value}款`;
                            }
                            return `${data.name}年<br/>发布游戏数量：${data.value}款`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '15%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.map(item => item.publishYear),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0,
                            formatter: function(value) {
                                if (value === '其他' || value === '即将推出' || value === '即将宣布') {
                                    return value;
                                }
                                return value + '年';
                            }
                        },
                        axisTick: {
                            alignWithLabel: true
                        }
                    },
                    yAxis: { 
                        type: 'value',
                        name: '游戏数量',
                        nameLocation: 'middle',
                        nameGap: 40,
                        axisLabel: {
                            formatter: '{value} 款'
                        }
                    },
                    series: [{
                        name: '发布数量',
                        data: processedData.map(item => item.gameCount),
                        type: 'line',
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: {
                            color: '#3498db'
                        },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(52, 152, 219, 0.5)' },
                                { offset: 1, color: 'rgba(52, 152, 219, 0.1)' }
                            ])
                        },
                        emphasis: {
                            focus: 'series',
                            itemStyle: {
                                color: '#2980b9'
                            }
                        }
                    }]
                };
                break;
                
            case 'recent-games-analysis':
                processedData = processRecentGamesData(data);
                option = {
                    title: {
                        text: '近一年游戏表现分析',
                        left: 'center',
                        top: 20
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: function(params) {
                            if (params.seriesType === 'pie') {
                                const evaluation = params.name;
                                const stats = processedData.find(item => item.evaluation === evaluation);
                                let result = `${evaluation}<br/>`;
                                result += `游戏数量：${stats.count}款<br/>`;
                                result += `平均好评率：${stats.avgGoodRate.toFixed(1)}%<br/>`;
                                result += '<br/>热门游戏：<br/>';
                                stats.games.forEach(game => {
                                    result += `${game.title}<br/>`;
                                    result += `评论数：${Math.round(game.reviewCountNum).toLocaleString()}条<br/>`;
                                    result += `好评率：${game.goodRate}%<br/>`;
                                    result += `价格：${game.finalPrice === '0' ? '免费' : '¥' + game.finalPrice}<br/>`;
                                    result += '<br/>';
                                });
                                return result;
                            }
                            return params.name;
                        }
                    },
                    legend: {
                        orient: 'vertical',
                        left: 'left',
                        top: 'middle'
                    },
                    series: [{
                        name: '游戏评价分布',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        center: ['60%', '50%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            formatter: '{b}\n{d}%'
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '20',
                                fontWeight: 'bold'
                            }
                        },
                        data: processedData.map(item => ({
                            name: item.evaluation,
                            value: item.count,
                            itemStyle: {
                                color: getEvaluationColor(item.evaluation)
                            }
                        }))
                    }]
                };
                break;
                
            case 'high-rating-popular-games':
                option = {
                    title: { text: '高好评率游戏' },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: data.map(item => item.title),
                        axisLabel: { rotate: 45 }
                    },
                    yAxis: [
                        {
                            type: 'value',
                            name: '好评率',
                            position: 'left'
                        },
                        {
                            type: 'value',
                            name: '评论数',
                            position: 'right'
                        }
                    ],
                    series: [
                        {
                            name: '好评率',
                            type: 'bar',
                            data: data.map(item => item.goodRateNum),
                            itemStyle: {
                                color: '#2ecc71'
                            }
                        },
                        {
                            name: '评论数',
                            type: 'line',
                            yAxisIndex: 1,
                            data: data.map(item => item.reviewCountNum),
                            itemStyle: {
                                color: '#e74c3c'
                            }
                        }
                    ]
                };
                break;
            case 'game-price-distribution':
                processedData = processPriceDistributionData(data);
                option = {
                    title: { 
                        text: '游戏价格区间分布',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        formatter: function(params) {
                            const data = params[0];
                            return `${data.name}<br/>游戏数量：${data.value}款`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '15%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.map(item => item.priceRange),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0
                        },
                        axisTick: {
                            alignWithLabel: true
                        }
                    },
                    yAxis: { 
                        type: 'value',
                        name: '游戏数量',
                        nameLocation: 'middle',
                        nameGap: 40,
                        axisLabel: {
                            formatter: function(value) {
                                if (value >= 10000) {
                                    return (value / 10000).toFixed(1) + '万';
                                }
                                return value;
                            }
                        }
                    },
                    series: [{
                        name: '游戏数量',
                        type: 'bar',
                        data: processedData.map(item => item.gameCount),
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#ff9a9e' },
                                { offset: 1, color: '#fad0c4' }
                            ])
                        },
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                if (params.value >= 10000) {
                                    return (params.value / 10000).toFixed(1) + '万';
                                }
                                return params.value;
                            }
                        }
                    }]
                };
                break;
            case 'game-price-goodrate-analysis':
                processedData = processPriceGoodrateData(data);
                option = {
                    title: { 
                        text: '价格与好评率分析',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        axisPointer: {
                            type: 'cross'
                        },
                        formatter: function(params) {
                            const data = params[0];
                            const item = processedData.find(d => d.priceRange === data.name);
                            if (!item) return data.name;
                            
                            return `${data.name}<br/>` +
                                   `好评率：${item.avgGoodRate.toFixed(1)}%<br/>` +
                                   `游戏数量：${item.gameCount}款<br/>` +
                                   `评论总数：${Math.round(item.totalReviewCount).toLocaleString()}条`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '15%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.map(item => item.priceRange),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0
                        },
                        axisTick: {
                            alignWithLabel: true
                        }
                    },
                    yAxis: [
                        {
                            type: 'value',
                            name: '好评率',
                            min: 60,
                            max: 80,
                            axisLabel: {
                                formatter: '{value}%'
                            }
                        },
                        {
                            type: 'value',
                            name: '游戏数量',
                            position: 'right',
                            axisLabel: {
                                formatter: function(value) {
                                    if (value >= 10000) {
                                        return (value / 10000).toFixed(1) + '万';
                                    }
                                    return value;
                                }
                            }
                        }
                    ],
                    series: [
                        {
                            name: '好评率',
                            type: 'line',
                            smooth: true,
                            symbol: 'circle',
                            symbolSize: 8,
                            itemStyle: {
                                color: '#3498db'
                            },
                            lineStyle: {
                                width: 3
                            },
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: 'rgba(52, 152, 219, 0.5)' },
                                    { offset: 1, color: 'rgba(52, 152, 219, 0.1)' }
                                ])
                            },
                            data: processedData.map(item => item.avgGoodRate)
                        },
                        {
                            name: '游戏数量',
                            type: 'bar',
                            yAxisIndex: 1,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#2ecc71' },
                                    { offset: 1, color: '#27ae60' }
                                ])
                            },
                            data: processedData.map(item => item.gameCount)
                        }
                    ]
                };
                break;
            case 'top1000-games-by-sales':
                processedData = processSalesData(data);
                option = {
                    title: { 
                        text: '游戏销售额分析',
                        subtext: '展示前40名游戏销售额',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: function(params) {
                            const data = params[0];
                            const item = processedData.top40.find(d => d.title === data.name);
                            if (!item) return data.name;
                            
                            return `${item.title}<br/>` +
                                   `销售额：${(item.sales / 100000000).toFixed(2)}亿元<br/>` +
                                   `原价：¥${item.originalPrice}<br/>` +
                                   `评论数：${Math.round(item.reviewCount).toLocaleString()}条<br/>` +
                                   `占比：${((item.sales / processedData.totalSales) * 100).toFixed(1)}%`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '25%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.top40.map(item => item.title),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0,
                            formatter: function(value) {
                                if (value.length > 10) {
                                    return value.substring(0, 10) + '...';
                                }
                                return value;
                            },
                            fontSize: 11,
                            margin: 15,
                            color: '#666'
                        },
                        axisTick: {
                            alignWithLabel: true,
                            length: 5
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#999'
                            }
                        }
                    },
                    yAxis: { 
                        type: 'value',
                        name: '销售额（亿元）',
                        nameLocation: 'middle',
                        nameGap: 40,
                        axisLabel: {
                            formatter: function(value) {
                                return value.toFixed(1);
                            },
                            fontSize: 12,
                            color: '#666'
                        },
                        splitLine: {
                            lineStyle: {
                                type: 'dashed',
                                color: '#ddd'
                            }
                        }
                    },
                    series: [{
                        name: '销售额',
                        type: 'bar',
                        barWidth: '40%',
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#f1c40f' },
                                { offset: 1, color: '#f39c12' }
                            ])
                        },
                        data: processedData.top40.map(item => ({
                            value: item.sales / 100000000,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#f1c40f' },
                                    { offset: 1, color: '#f39c12' }
                                ])
                            }
                        })),
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.value.toFixed(1) + '亿';
                            },
                            fontSize: 11,
                            color: '#666'
                        }
                    }],
                    graphic: [{
                        type: 'text',
                        left: 'right',
                        top: 'top',
                        style: {
                            text: `其他游戏总销售额：${(processedData.othersSales / 100000000).toFixed(2)}亿元\n占比：${((processedData.othersSales / processedData.totalSales) * 100).toFixed(1)}%`,
                            fontSize: 14,
                            fontWeight: 'bold',
                            fill: '#666',
                            lineHeight: 24
                        }
                    }]
                };
                break;
            case 'top-developers-by-goodcount':
                processedData = processDeveloperGoodrateData(data);
                option = {
                    title: { 
                        text: '开发商好评率分析',
                        subtext: '展示前40名开发商好评数据',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: function(params) {
                            const data = params[0];
                            const item = processedData.top40.find(d => d.developer === data.name);
                            if (!item) return data.name;
                            
                            return `${item.developer}<br/>` +
                                   `好评率：${item.avgGoodRate.toFixed(1)}%<br/>` +
                                   `游戏数量：${item.gameCount}款<br/>` +
                                   `好评数：${Math.round(item.totalGoodReviews).toLocaleString()}条<br/>` +
                                   `占比：${((item.totalGoodReviews / processedData.totalGoodReviews) * 100).toFixed(1)}%`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '25%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.top40.map(item => item.developer),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0,
                            formatter: function(value) {
                                if (value.length > 12) {
                                    return value.substring(0, 12) + '...';
                                }
                                return value;
                            },
                            fontSize: 11,
                            margin: 15,
                            color: '#666'
                        },
                        axisTick: {
                            alignWithLabel: true,
                            length: 5
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#999'
                            }
                        }
                    },
                    yAxis: { 
                        type: 'value',
                        name: '好评率（%）',
                        nameLocation: 'middle',
                        nameGap: 40,
                        min: 50,
                        max: 100,
                        axisLabel: {
                            formatter: function(value) {
                                return value.toFixed(0);
                            },
                            fontSize: 12,
                            color: '#666'
                        },
                        splitLine: {
                            lineStyle: {
                                type: 'dashed',
                                color: '#ddd'
                            }
                        }
                    },
                    series: [{
                        name: '好评率',
                        type: 'bar',
                        barWidth: '40%',
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#1abc9c' },
                                { offset: 1, color: '#16a085' }
                            ])
                        },
                        data: processedData.top40.map(item => ({
                            value: item.avgGoodRate,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#1abc9c' },
                                    { offset: 1, color: '#16a085' }
                                ])
                            }
                        })),
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.value.toFixed(1) + '%';
                            },
                            fontSize: 11,
                            color: '#666'
                        }
                    }],
                    graphic: [{
                        type: 'text',
                        left: 'right',
                        top: 'top',
                        style: {
                            text: `其他开发商总好评数：${Math.round(processedData.othersGoodReviews).toLocaleString()}条\n占比：${((processedData.othersGoodReviews / processedData.totalGoodReviews) * 100).toFixed(1)}%`,
                            fontSize: 14,
                            fontWeight: 'bold',
                            fill: '#666',
                            lineHeight: 24
                        }
                    }]
                };
                break;
            case 'top-developers-by-sales':
                processedData = processDeveloperSalesData(data);
                option = {
                    title: { 
                        text: '开发商销售额分析',
                        subtext: '展示前40名开发商销售额',
                        left: 'center',
                        top: 20
                    },
                    tooltip: { 
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        },
                        formatter: function(params) {
                            const data = params[0];
                            const item = processedData.top40.find(d => d.developer === data.name);
                            if (!item) return data.name;
                            
                            return `${item.developer}<br/>` +
                                   `销售额：${(item.totalSales / 100000000).toFixed(2)}亿元<br/>` +
                                   `游戏数量：${item.gameCount}款<br/>` +
                                   `好评率：${item.avgGoodRate.toFixed(1)}%<br/>` +
                                   `占比：${((item.totalSales / processedData.totalSales) * 100).toFixed(1)}%`;
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '25%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: { 
                        type: 'category', 
                        data: processedData.top40.map(item => item.developer),
                        axisLabel: { 
                            rotate: 45,
                            interval: 0,
                            formatter: function(value) {
                                if (value.length > 12) {
                                    return value.substring(0, 12) + '...';
                                }
                                return value;
                            },
                            fontSize: 11,
                            margin: 15,
                            color: '#666'
                        },
                        axisTick: {
                            alignWithLabel: true,
                            length: 5
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#999'
                            }
                        }
                    },
                    yAxis: { 
                        type: 'value',
                        name: '销售额（亿元）',
                        nameLocation: 'middle',
                        nameGap: 40,
                        axisLabel: {
                            formatter: function(value) {
                                return value.toFixed(1);
                            },
                            fontSize: 12,
                            color: '#666'
                        },
                        splitLine: {
                            lineStyle: {
                                type: 'dashed',
                                color: '#ddd'
                            }
                        }
                    },
                    series: [{
                        name: '销售额',
                        type: 'bar',
                        barWidth: '40%',
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#e67e22' },
                                { offset: 1, color: '#d35400' }
                            ])
                        },
                        data: processedData.top40.map(item => ({
                            value: item.totalSales / 100000000,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#e67e22' },
                                    { offset: 1, color: '#d35400' }
                                ])
                            }
                        })),
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(params) {
                                return params.value.toFixed(1) + '亿';
                            },
                            fontSize: 11,
                            color: '#666'
                        }
                    }],
                    graphic: [{
                        type: 'text',
                        left: 'right',
                        top: 'top',
                        style: {
                            text: `其他开发商总销售额：${(processedData.othersSales / 100000000).toFixed(2)}亿元\n占比：${((processedData.othersSales / processedData.totalSales) * 100).toFixed(1)}%`,
                            fontSize: 14,
                            fontWeight: 'bold',
                            fill: '#666',
                            lineHeight: 24
                        }
                    }]
                };
                break;
            default:
                // 显示主图表
                newMainChart.style.display = 'block';
                if (gameTypeCharts) {
                    gameTypeCharts.style.display = 'none';
                }
                
                // 初始化主图表
                if (chart && !chart.isDisposed()) {
                    chart.dispose();
                }
                chart = echarts.init(newMainChart);
                
                // 设置图表配置
                chart.setOption(option);
        }
        
        // 设置图表配置
        if (chart && !chart.isDisposed()) {
            try {
                chart.setOption(option, true);
            } catch (error) {
                console.error('设置图表配置失败:', error);
            }
        }
    } catch (error) {
        console.error('更新图表时出错:', error);
    }
}

// 获取评价等级对应的颜色
function getEvaluationColor(evaluation) {
    const colorMap = {
        '好评如潮': '#2ecc71',
        '特别好评': '#27ae60',
        '多半好评': '#f1c40f',
        '褒贬不一': '#e67e22',
        '多半差评': '#e74c3c',
        '差评如潮': '#c0392b'
    };
    return colorMap[evaluation] || '#95a5a6';
}

// 窗口大小改变时重绘图表
window.addEventListener('resize', () => {
    if (chart && !chart.isDisposed()) {
        chart.resize();
    }
}); 