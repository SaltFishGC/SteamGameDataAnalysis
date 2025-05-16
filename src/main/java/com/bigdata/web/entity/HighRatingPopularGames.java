package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("high_rating_popular_games")
public class HighRatingPopularGames {

  private String title;
  private Date releaseDate;
  private Double goodRateNum;
  private Double reviewCountNum;
  private String originalPrice;
  private String finalPrice;
  private String developer;
  private String publisher;
  private String overallEvaluation;

}
