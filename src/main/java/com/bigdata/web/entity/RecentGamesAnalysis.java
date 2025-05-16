package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("recent_games_analysis")
public class RecentGamesAnalysis {

  private String title;
  private Date releaseDate;
  private Double reviewCountNum;
  private String goodRate;
  private String originalPrice;
  private String finalPrice;
  private String developer;
  private String publisher;
  private String overallEvaluation;
  private Long rankByReviews;

}
