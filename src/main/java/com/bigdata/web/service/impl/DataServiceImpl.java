package com.bigdata.web.service.impl;

import com.bigdata.web.entity.*;
import com.bigdata.web.mapper.DataMapper;
import com.bigdata.web.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DataServiceImpl implements DataService {

    @Autowired
    private DataMapper dataMapper;

    @Override
    public List<GamePriceDistribution> getAllGamePriceDistribution() {
        return dataMapper.getAllGamePriceDistribution();
    }

    @Override
    public List<GamePriceGoodrateAnalysis> getAllGamePriceGoodrateAnalysis() {
        return dataMapper.getAllGamePriceGoodrateAnalysis();
    }

    @Override
    public List<GameTypeAnalysis> getAllGameTypeAnalysis() {
        return dataMapper.getAllGameTypeAnalysis();
    }

    @Override
    public List<HighRatingPopularGames> getAllHighRatingPopularGames() {
        return dataMapper.getAllHighRatingPopularGames();
    }

    @Override
    public List<PublishYearStats> getAllPublishYearStats() {
        return dataMapper.getAllPublishYearStats();
    }

    @Override
    public List<RecentGamesAnalysis> getAllRecentGamesAnalysis() {
        return dataMapper.getAllRecentGamesAnalysis();
    }

    @Override
    public List<Top1000GamesBySales> getAllTop1000GamesBySales() {
        return dataMapper.getAllTop1000GamesBySales();
    }

    @Override
    public List<TopDevelopersByGoodcount> getAllTopDevelopersByGoodcount() {
        return dataMapper.getAllTopDevelopersByGoodcount();
    }

    @Override
    public List<TopDevelopersBySales> getAllTopDevelopersBySales() {
        return dataMapper.getAllTopDevelopersBySales();
    }

    @Override
    public List<YearlyTopGames> getAllYearlyTopGames() {
        return dataMapper.getAllYearlyTopGames();
    }
}
