package com.bigdata.web.mapper;

import com.bigdata.web.entity.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface DataMapper {

    @Select("SELECT * FROM game_price_distribution")
    List<GamePriceDistribution> getAllGamePriceDistribution();

    @Select("SELECT * FROM game_price_goodrate_analysis")
    List<GamePriceGoodrateAnalysis> getAllGamePriceGoodrateAnalysis();

    @Select("SELECT * FROM game_type_analysis")
    List<GameTypeAnalysis> getAllGameTypeAnalysis();

    @Select("SELECT * FROM high_rating_popular_games ORDER BY good_rate_num DESC")
    List<HighRatingPopularGames> getAllHighRatingPopularGames();

    @Select("SELECT * FROM publish_year_stats")
    List<PublishYearStats> getAllPublishYearStats();

    @Select("SELECT * FROM recent_games_analysis")
    List<RecentGamesAnalysis> getAllRecentGamesAnalysis();

    @Select("SELECT * FROM top1000_games_by_sales")
    List<Top1000GamesBySales> getAllTop1000GamesBySales();

    @Select("SELECT * FROM top_developers_by_goodcount")
    List<TopDevelopersByGoodcount> getAllTopDevelopersByGoodcount();

    @Select("SELECT * FROM top_developers_by_sales")
    List<TopDevelopersBySales> getAllTopDevelopersBySales();

    @Select("SELECT * FROM yearly_top_games")
    List<YearlyTopGames> getAllYearlyTopGames();
}
