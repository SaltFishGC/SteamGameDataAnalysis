package com.bigdata.web.service;

import com.bigdata.web.entity.*;
import java.util.List;

public interface DataService {

    List<GamePriceDistribution> getAllGamePriceDistribution();

    List<GamePriceGoodrateAnalysis> getAllGamePriceGoodrateAnalysis();

    List<GameTypeAnalysis> getAllGameTypeAnalysis();

    List<HighRatingPopularGames> getAllHighRatingPopularGames();

    List<PublishYearStats> getAllPublishYearStats();

    List<RecentGamesAnalysis> getAllRecentGamesAnalysis();

    List<Top1000GamesBySales> getAllTop1000GamesBySales();

    List<TopDevelopersByGoodcount> getAllTopDevelopersByGoodcount();

    List<TopDevelopersBySales> getAllTopDevelopersBySales();

    List<YearlyTopGames> getAllYearlyTopGames();
}
