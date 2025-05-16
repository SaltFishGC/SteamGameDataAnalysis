package com.bigdata.web.controller;

import com.bigdata.web.entity.*;
import com.bigdata.web.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/data")
public class DataController {

    @Autowired
    private DataService dataService;

    @GetMapping("/game-price-distribution")
    public List<GamePriceDistribution> getGamePriceDistribution() {
        return dataService.getAllGamePriceDistribution();
    }

    @GetMapping("/game-price-goodrate-analysis")
    public List<GamePriceGoodrateAnalysis> getGamePriceGoodrateAnalysis() {
        return dataService.getAllGamePriceGoodrateAnalysis();
    }

    @GetMapping("/game-type-analysis")
    public List<GameTypeAnalysis> getGameTypeAnalysis() {
        return dataService.getAllGameTypeAnalysis();
    }

    @GetMapping("/high-rating-popular-games")
    public List<HighRatingPopularGames> getHighRatingPopularGames() {
        return dataService.getAllHighRatingPopularGames();
    }

    @GetMapping("/publish-year-stats")
    public List<PublishYearStats> getPublishYearStats() {
        return dataService.getAllPublishYearStats();
    }

    @GetMapping("/recent-games-analysis")
    public List<RecentGamesAnalysis> getRecentGamesAnalysis() {
        return dataService.getAllRecentGamesAnalysis();
    }

    @GetMapping("/top1000-games-by-sales")
    public List<Top1000GamesBySales> getTop1000GamesBySales() {
        return dataService.getAllTop1000GamesBySales();
    }

    @GetMapping("/top-developers-by-goodcount")
    public List<TopDevelopersByGoodcount> getTopDevelopersByGoodcount() {
        return dataService.getAllTopDevelopersByGoodcount();
    }

    @GetMapping("/top-developers-by-sales")
    public List<TopDevelopersBySales> getTopDevelopersBySales() {
        return dataService.getAllTopDevelopersBySales();
    }

    @GetMapping("/yearly-top-games")
    public List<YearlyTopGames> getYearlyTopGames() {
        return dataService.getAllYearlyTopGames();
    }
}
