import procyclingstats as pcs
import pandas as pd
import numpy as np
import time


pd.options.mode.chained_assignment = 'warn'  # default='warn'

def choose_gt():
    print("Choose a grand tour: ")
    print("a) Tour de France")
    print("b) Giro d'Italia")
    print("c) Vuelta")
    
    choice = input("Enter your choice (a/b/c): ").lower()
    
    if choice == 'a':
        v = 'tour-de-france'
        return v
    elif choice == 'b':
        v = 'giro-d-italia'
        return v
    elif choice == 'c':
        v = 'vuelta-a-espana'
        return v
    else:
        print("Invalid choice. Please choose a valid option.")


def get_race(gt = 'tour-de-france', edition = '2023'):
    #get race
    gt = choose_gt()
    edition = str(input("Enter edition year (ex. 2023): "))

    race_url = 'race/'+gt+"/"+edition+'/'
    grandtour = pcs.Race(race_url)
    #"race/giro-d-italia/2023/"
    return grandtour
        
    

def get_stage(grandtour):
    # get stage
    df_stages = pd.DataFrame(grandtour.parse()['stages'])
    return df_stages


def get_race_stages_result(df):
    # create target df
    df_result = pd.DataFrame(columns=['rider_name', 'time', 'bonus','date', 'team_name'])
    # get all stages results into target df
    for i in df['stage_url']:
        
        stage_date = pcs.Stage(i).date()
        
        df_satge_results = pd.DataFrame.from_dict(pcs.Stage(i).results())
        df_satge_results['date'] = stage_date
        df_extract = df_satge_results[['rider_name','time','bonus','date','team_name']]
        
        df_result = pd.concat([df_result,df_extract])
    return df_result


# massage results
# time to seconds
def massage_results(df):
    df['seconds'] = pd.to_timedelta(df.time).dt.seconds
    df = df.sort_values(by = ['date'])
    df['acc_seconds'] = df.groupby('rider_name')['seconds'].cumsum()
    # grant time bonuses when due
    df.time_sec = df.acc_seconds - df.bonus

    #df text to display
    
    # finding the dnf days and eliminating rider from competition
    df['yesterday'] = df.groupby('rider_name')['acc_seconds'].shift(1)
    elimination_value = df['acc_seconds'].max()
    df['time_sec'] = df.acc_seconds
    df.loc[df.time_sec == df.yesterday,'time_sec'] = elimination_value
    df.time_sec = df.time_sec.fillna(elimination_value)

    a = df.groupby('date')[['time_sec']].min().reset_index().date
    b = df.groupby('date')[['time_sec']].min().reset_index().time_sec

    df['yj'] = df.date.map(dict(zip(a,b)))
    df['gap'] =  df.time_sec - df.yj
    # crafting timestamp
    minutes = df.gap.apply(lambda x : int(time.strftime("%H",time.gmtime(x)))*60
                        +int(time.strftime("%M",time.gmtime(x))))
    seconds = df.gap.apply(lambda x : time.strftime(".%S",time.gmtime(x)))
    df['text-to-display'] = minutes.astype(str)+seconds

    return df



def transfer_to_race_output(df):
    df_output = pd.pivot_table(df.reset_index(), index=['rider_name','team_name'],values='text-to-display',columns='date', aggfunc=sum).reset_index()
    df_output.to_csv('output_gap_auto.csv', index=False)
    print (df_output.head(5))

if __name__ == "__main__":
    grandtour = get_race()
    print("race url" , grandtour)
    gt_stages = get_stage(grandtour)
    print ("stages complete")
    race_details = get_race_stages_result(df=gt_stages)

    results_processed = massage_results(df = race_details)
    print("processed: ", results_processed)
    transfer_to_race_output(df = results_processed)


